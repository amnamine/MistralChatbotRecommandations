import os
import pandas as pd
import requests
import json

MISTRAL_API_KEY = ""
MISTRAL_API_URL = "https://api.mistral.ai/v1/chat/completions"

# Load RAG reference examples
try:
    sms_examples_df = pd.read_csv("generated_sms (2).csv")
except Exception as e:
    sms_examples_df = None
    print(f"Warning: Could not load generated_sms (2).csv: {e}")

def get_rag_examples(persona, language, count=2):
    """Retrieve similar past SMS generations for RAG prompting context."""
    if sms_examples_df is None:
        return []
    
    # Try to filter by persona and language
    matches = sms_examples_df[
        (sms_examples_df['persona'].str.lower() == str(persona).lower()) & 
        (sms_examples_df['language'].str.lower() == str(language).lower())
    ]
    
    if len(matches) < count:
        # fallback to language only
        matches = sms_examples_df[sms_examples_df['language'].str.lower() == str(language).lower()]
    
    if len(matches) < count:
        matches = sms_examples_df
        
    examples = []
    for _, row in matches.head(count).iterrows():
        examples.append({
            "offer": row.get("offer", ""),
            "price": row.get("price", ""),
            "tone": row.get("tone", ""),
            "sms": row.get("generated_sms", "")
        })
    return examples

def generate_sms(firstname, persona, language, offer, price, tone, usage, message_style):
    """
    Generate a personalized SMS using Mistral-7b-Instruct-v0.2 API via RAG prompting.
    """
    examples = get_rag_examples(persona, language)
    
    # Constructing RAG prompt context
    examples_str = ""
    for idx, ex in enumerate(examples):
        examples_str += f"Example {idx+1}:\n"
        examples_str += f"- Offer: {ex['offer']}\n"
        examples_str += f"- Price: {ex['price']} DA\n"
        examples_str += f"- Tone: {ex['tone']}\n"
        examples_str += f"- Generated SMS: \"{ex['sms']}\"\n\n"

    system_instruction = (
        "You are an expert telecom marketing AI specialized in generating short, highly-converting SMS. "
        "Your task is to write EXACTLY ONE personalized SMS based on the input parameters and reference examples. "
        "Strictly follow these output formatting rules:\n"
        "1. Output ONLY the raw generated SMS string. No headers, no prefix, no quotation marks around the final response, no comments, no [INST] tags.\n"
        "2. Do not invent any promotional offers, pricing details or info not provided.\n"
        "3. Use Algerian Darija (AR_LATIN) if the language parameter is AR_LATIN, Arabic (AR_LIT) if it is AR_LIT, and French (FR) if it is FR."
    )

    user_prompt = f"""
Input parameters:
- Customer Name: {firstname if pd.notna(firstname) and firstname else "Valued Customer"}
- Persona: {persona}
- Language: {language}
- Offer: {offer}
- Price: {price} DA
- Tone: {tone}
- Usage context: {usage}
- Message style: {message_style}

Reference Examples:
{examples_str}

Please generate the SMS now:
"""

    headers = {
        "Authorization": f"Bearer {MISTRAL_API_KEY}",
        "Content-Type": "application/json"
    }

    payload = {
        "model": "open-mistral-7b",
        "messages": [
            {"role": "system", "content": system_instruction},
            {"role": "user", "content": user_prompt}
        ],
        "temperature": 0.7,
        "max_tokens": 150
    }

    try:
        response = requests.post(MISTRAL_API_URL, headers=headers, json=payload, timeout=15)
        response.raise_for_status()
        data = response.json()
        sms = data["choices"][0]["message"]["content"].strip()
        # Clean any accidental quotes
        if sms.startswith('"') and sms.endswith('"'):
            sms = sms[1:-1]
        return sms
    except Exception as e:
        print(f"Error calling Mistral API: {e}")
        # Return a fallback RAG message
        if examples:
            fallback = examples[0]['sms']
            if firstname:
                return f"{firstname}, {fallback}"
            return fallback
        return f"Profitez de l'offre {offer} pour seulement {price} DA. Restez connecté !"

if __name__ == "__main__":
    # Test generation
    test_sms = generate_sms(
        firstname="Karim",
        persona="Digital Heavy User",
        language="FR",
        offer="Pack Streaming 450Go",
        price="8900",
        tone="Premium",
        usage="Streaming",
        message_style="Entertainment"
    )
    print("Test Generation Result:")
    print(test_sms)
