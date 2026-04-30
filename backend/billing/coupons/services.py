def calculate_discount(self, amount):
    if self.discount_type == self.DiscountType.PERCENTAGE:
        discount = (self.discount_value / 100) * amount

        if self.max_discount_cap:
            discount = min(discount, self.max_discount_cap)

    else:
        discount = self.discount_value

    return min(discount, amount)