import os
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import uvicorn

from sms_generator import generate_sms

app = FastAPI(title="Smart AI Telecom Marketing API", version="1.0.0")

# Enable CORS for frontend interface
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load datasets
def load_customers():
    try:
        df = pd.read_csv("cliensts_test2.csv")
        # Clean columns and resolve empty firstname/prices
        df['firstname'] = df['firstname'].fillna("Valued Customer")
        df['price'] = df['price'].fillna(0).astype(int)
        # Add index column for ID referencing
        df = df.reset_index().rename(columns={"index": "id"})
        return df.to_dict(orient="records")
    except Exception as e:
        print(f"Error loading customers CSV: {e}")
        return []

class CustomerProfile(BaseModel):
    firstname: Optional[str] = "Valued Customer"
    persona: str
    language: str
    offer: str
    price: str
    tone: str
    usage: str
    message_style: str

class SingleGenerationRequest(BaseModel):
    customer_id: Optional[int] = None
    custom_profile: Optional[CustomerProfile] = None

@app.get("/api/customers")
def get_customers():
    return load_customers()

@app.get("/api/stats")
def get_stats():
    customers = load_customers()
    if not customers:
        return {"total_customers": 0, "personas": {}, "languages": {}}
    
    df = pd.DataFrame(customers)
    persona_counts = df['persona'].value_counts().to_dict()
    language_counts = df['language'].value_counts().to_dict()
    
    return {
        "total_customers": len(df),
        "personas": persona_counts,
        "languages": language_counts,
        "average_price": float(df[df['price'] > 0]['price'].mean()) if not df[df['price'] > 0].empty else 0.0
    }

@app.post("/api/generate-single")
def post_generate_single(req: SingleGenerationRequest):
    profile = None
    
    if req.customer_id is not None:
        customers = load_customers()
        matching = [c for c in customers if c["id"] == req.customer_id]
        if not matching:
            raise HTTPException(status_code=404, detail="Customer ID not found")
        c = matching[0]
        profile = CustomerProfile(
            firstname=c.get("firstname", "Valued Customer"),
            persona=c.get("persona", ""),
            language=c.get("language", ""),
            offer=c.get("offer", ""),
            price=str(c.get("price", "0")),
            tone=c.get("tone", ""),
            usage=c.get("usage", ""),
            message_style=c.get("message_style", "")
        )
    elif req.custom_profile is not None:
        profile = req.custom_profile
    else:
        raise HTTPException(status_code=400, detail="Either customer_id or custom_profile must be provided")
        
    sms = generate_sms(
        firstname=profile.firstname,
        persona=profile.persona,
        language=profile.language,
        offer=profile.offer,
        price=profile.price,
        tone=profile.tone,
        usage=profile.usage,
        message_style=profile.message_style
    )
    
    return {
        "profile": profile.dict(),
        "generated_sms": sms
    }

@app.post("/api/generate-batch")
def post_generate_batch():
    customers = load_customers()
    results = []
    
    # Generate SMS for each customer using parallel or sequential calls (sequential here to maintain safety/rate limits)
    for c in customers:
        sms = generate_sms(
            firstname=c.get("firstname", "Valued Customer"),
            persona=c.get("persona", ""),
            language=c.get("language", ""),
            offer=c.get("offer", ""),
            price=str(c.get("price", "0")),
            tone=c.get("tone", ""),
            usage=c.get("usage", ""),
            message_style=c.get("message_style", "")
        )
        results.append({
            "id": c["id"],
            "firstname": c["firstname"],
            "persona": c["persona"],
            "language": c["language"],
            "offer": c["offer"],
            "price": c["price"],
            "tone": c["tone"],
            "usage": c["usage"],
            "message_style": c["message_style"],
            "generated_sms": sms
        })
        
    return results

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
