import com.sun.net.httpserver.HttpServer;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpExchange;

import java.io.IOException;
import java.io.OutputStream;
import java.io.InputStream;
import java.net.InetSocketAddress;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.nio.file.StandardOpenOption;
import java.util.UUID;

/**
 * TelecomCampaignGateway - Java Gateway Orchestrator.
 * Acts as an API Gateway, logging requests, proxying campaign generation to the FastAPI service,
 * and saving approved campaigns to a local file database (campaign_runs.json).
 */
public class TelecomCampaignGateway {

    private static final int PORT = 8080;
    private static final String FASTAPI_BASE_URL = "http://127.0.0.1:8000";
    private static final String LOG_FILE = "campaign_runs.json";

    public static void main(String[] args) throws Exception {
        // Initialize local log file if it doesn't exist
        if (!Files.exists(Paths.get(LOG_FILE))) {
            Files.writeString(Paths.get(LOG_FILE), "[]", StandardCharsets.UTF_8);
        }

        HttpServer server = HttpServer.create(new InetSocketAddress(PORT), 0);
        
        // Proxy routes
        server.createContext("/api/gateway/customers", new CustomersProxyHandler());
        server.createContext("/api/gateway/stats", new StatsProxyHandler());
        server.createContext("/api/gateway/generate-single", new GenerateSingleProxyHandler());
        server.createContext("/api/gateway/generate-batch", new GenerateBatchProxyHandler());
        
        // Campaign log saving endpoint (Java orchestration exclusive)
        server.createContext("/api/gateway/campaigns/save", new SaveCampaignHandler());
        server.createContext("/api/gateway/campaigns/list", new ListCampaignsHandler());

        server.setExecutor(null); // default executor
        System.out.println(">>> Java Telecom Campaign Gateway running on port " + PORT + "...");
        server.start();
    }

    private static void enableCors(HttpExchange exchange) {
        exchange.getResponseHeaders().add("Access-Control-Allow-Origin", "*");
        exchange.getResponseHeaders().add("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        exchange.getResponseHeaders().add("Access-Control-Allow-Headers", "Content-Type, Authorization");
    }

    private static void handleOptions(HttpExchange exchange) throws IOException {
        enableCors(exchange);
        exchange.sendResponseHeaders(204, -1);
        exchange.close();
    }

    // Helper to perform HTTP GET requests to Python FastAPI
    private static void proxyGet(HttpExchange exchange, String path) throws IOException {
        if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
            handleOptions(exchange);
            return;
        }
        enableCors(exchange);
        try {
            java.net.URL url = new java.net.URL(FASTAPI_BASE_URL + path);
            java.net.HttpURLConnection conn = (java.net.HttpURLConnection) url.openConnection();
            conn.setRequestMethod("GET");
            
            int responseCode = conn.getResponseCode();
            InputStream is = (responseCode >= 200 && responseCode < 300) ? conn.getInputStream() : conn.getErrorStream();
            byte[] responseBytes = is.readAllBytes();
            
            exchange.getResponseHeaders().set("Content-Type", "application/json; charset=utf-8");
            exchange.sendResponseHeaders(responseCode, responseBytes.length);
            try (OutputStream os = exchange.getResponseBody()) {
                os.write(responseBytes);
            }
        } catch (Exception e) {
            sendError(exchange, e.getMessage());
        }
    }

    // Helper to perform HTTP POST requests to Python FastAPI
    private static void proxyPost(HttpExchange exchange, String path) throws IOException {
        if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
            handleOptions(exchange);
            return;
        }
        enableCors(exchange);
        try {
            InputStream is = exchange.getRequestBody();
            byte[] requestBodyBytes = is.readAllBytes();

            java.net.URL url = new java.net.URL(FASTAPI_BASE_URL + path);
            java.net.HttpURLConnection conn = (java.net.HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setDoOutput(true);
            
            try (OutputStream os = conn.getOutputStream()) {
                os.write(requestBodyBytes);
            }
            
            int responseCode = conn.getResponseCode();
            InputStream responseStream = (responseCode >= 200 && responseCode < 300) ? conn.getInputStream() : conn.getErrorStream();
            byte[] responseBytes = responseStream.readAllBytes();

            exchange.getResponseHeaders().set("Content-Type", "application/json; charset=utf-8");
            exchange.sendResponseHeaders(responseCode, responseBytes.length);
            try (OutputStream os = exchange.getResponseBody()) {
                os.write(responseBytes);
            }
        } catch (Exception e) {
            sendError(exchange, e.getMessage());
        }
    }

    private static void sendError(HttpExchange exchange, String errorMsg) throws IOException {
        String jsonError = "{\"error\": \"" + errorMsg.replace("\"", "\\\"") + "\"}";
        byte[] bytes = jsonError.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "application/json; charset=utf-8");
        exchange.sendResponseHeaders(500, bytes.length);
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(bytes);
        }
    }

    static class CustomersProxyHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            proxyGet(exchange, "/api/customers");
        }
    }

    static class StatsProxyHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            proxyGet(exchange, "/api/stats");
        }
    }

    static class GenerateSingleProxyHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            proxyPost(exchange, "/api/generate-single");
        }
    }

    static class GenerateBatchProxyHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            proxyPost(exchange, "/api/generate-batch");
        }
    }

    static class SaveCampaignHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
                handleOptions(exchange);
                return;
            }
            enableCors(exchange);
            if (!"POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                exchange.sendResponseHeaders(405, -1);
                exchange.close();
                return;
            }

            try {
                InputStream is = exchange.getRequestBody();
                String campaignData = new String(is.readAllBytes(), StandardCharsets.UTF_8);

                // Simple JSON manipulation to append this run to local campaign_runs.json
                String fileContent = Files.readString(Paths.get(LOG_FILE), StandardCharsets.UTF_8).trim();
                if (fileContent.isEmpty() || "[]".equals(fileContent)) {
                    fileContent = "[" + campaignData + "]";
                } else {
                    fileContent = fileContent.substring(0, fileContent.length() - 1) + "," + campaignData + "]";
                }

                Files.writeString(Paths.get(LOG_FILE), fileContent, StandardCharsets.UTF_8);

                String response = "{\"status\": \"success\", \"message\": \"Campaign saved successfully by Java Gateway\"}";
                byte[] responseBytes = response.getBytes(StandardCharsets.UTF_8);
                exchange.getResponseHeaders().set("Content-Type", "application/json");
                exchange.sendResponseHeaders(200, responseBytes.length);
                try (OutputStream os = exchange.getResponseBody()) {
                    os.write(responseBytes);
                }
            } catch (Exception e) {
                sendError(exchange, e.getMessage());
            }
        }
    }

    static class ListCampaignsHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
                handleOptions(exchange);
                return;
            }
            enableCors(exchange);
            try {
                String fileContent = Files.readString(Paths.get(LOG_FILE), StandardCharsets.UTF_8);
                byte[] responseBytes = fileContent.getBytes(StandardCharsets.UTF_8);
                exchange.getResponseHeaders().set("Content-Type", "application/json");
                exchange.sendResponseHeaders(200, responseBytes.length);
                try (OutputStream os = exchange.getResponseBody()) {
                    os.write(responseBytes);
                }
            } catch (Exception e) {
                sendError(exchange, e.getMessage());
            }
        }
    }
}
