// {
//     products: {
//         ID_PRODUCT: [
//             {label: 'XXXX', amount: '50', quantity: '1'},
//             ...
//         ],
//         ...
//     },
//     discounts: [
//         {type: 'coupon', value: 'toto4000'},
//         {type: 'loyaltyPoints', value: '4000'},
//         ...
//     ],
//     shippingMethodId: SHIPPING_METHOD_ID,
//     shippingAddress: {},
//     billingAddress: {},
//     total: XXXX,
//     customerIp: '',
//     customerUserAgent: '',
//     deviceType: Desktop || Mobile
// }

import { Address } from "@/app/types/profileTypes";
import { discountType } from "@/app/types/sseTypes";

export interface OrderProduct {
  label: string;
  amount: string;
  quantity: string;
}

export interface OrderProducts {
  [ID_PRODUCT: string]: OrderProduct[];
}

export interface Discount {
  type: string;
  value: string;
}

export interface Order {
  products: OrderProducts;
  discounts: Discount[];
  shippingMethodId: number; // not sure type
  shippingAddress: Address;
  billingAddress: Address;
  total: number;
  customerIp: string;
  customerUserAgent: string;
  deviceType: "desktop" | "mobile";
}

export interface DiscountApplied {
  type: discountType;
  value: string;
  name: string;
}
