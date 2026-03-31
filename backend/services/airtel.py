import os
import base64
import requests

def get_airtel_token():
    url = "https://openapi.airtel.africa/auth/oauth2/token"

    api_key = os.getenv("AIRTEL_API_KEY")
    api_secret = os.getenv("AIRTEL_API_SECRET")

    credentials = f"{api_key}:{api_secret}"
    encoded_credentials = base64.b64encode(credentials.encode()).decode()

    headers = {
        "Authorization": f"Basic {encoded_credentials}",
        "Content-Type": "application/json"
    }

    payload = {"grant_type": "client_credentials"}

    response = requests.post(url, json=payload, headers=headers)
    return response.json().get("access_token")


def initiate_airtel_payment(phone, amount, reference):

    token = get_airtel_token()

    url = "https://openapi.airtel.africa/merchant/v1/payments/"

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    payload = {
        "reference": reference,
        "subscriber": {
            "country": "ZM",
            "currency": "ZMW",
            "msisdn": phone
        },
        "transaction": {
            "amount": str(amount),
            "country": "ZM",
            "currency": "ZMW",
            "id": reference
        }
    }

    response = requests.post(url, json=payload, headers=headers)
    return response.json()