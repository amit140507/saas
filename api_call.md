 http://localhost:8000/api/v1/auth/login/
 {
  "email": "VanessaTrainer@gym.com",
  "password": "amit@1234P"
}
{
  "email": "admin@ironparadise.com",
  "password": "amit@1234A"
}

http://localhost:8000/api/v1/orders/orders/
POST
{
  "tenant": "b645ba9a-7a85-4068-b6eb-7184e9612344",
  "client": "5e3541ba-b4d7-4b6b-a965-4c4c6654d663",
  "status": "pending",
  "payment_method": "card",
  "subtotal": "5000.00",
  "discount_amount": "500.00",
  "tax_amount": "810.00",
  "total_amount": "5310.00",
  "coupon": null,
  "notes": "Gold package order for client"
}


http://localhost:8000/api/v1/orders/orders/
GET