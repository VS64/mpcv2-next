"use client";

import {
  createContext,
  ReactNode,
  useState,
  useContext,
  Dispatch,
  SetStateAction,
  useEffect,
} from "react";
import { Image } from "./types/productsTypes";

export interface ProductCart {
  cartItemId: string; // uuid generated when adding a product in the cart. It is used to delete
  id: string;
  name: string;
  quantity: number;
  option: string; // Will the number of "g" or "unit" choosed
  per: string; // Will be either "g" or "unit"
  totalPrice: number;
  unitPrice: number;
  image: Image;
}

interface CartContext {
  cart: { total: number; products: ProductCart[] };
  setCart: Dispatch<
    SetStateAction<{
      total: number;
      products: ProductCart[];
    }>
  >;
}

const cartContext = createContext({} as CartContext);

export function CartProvider({
  children,
}: {
  children: ReactNode;
}): JSX.Element {
  const [cart, setCart] = useState({ total: 0, products: [] as ProductCart[] });

  useEffect(() => {
    // If there is a cart in the localStorage, set the cart state with its value
    if (!!localStorage.getItem("cart")) {
      setCart(JSON.parse(localStorage.getItem("cart") as string));
    }
  }, []);

  return (
    <cartContext.Provider
      value={{
        cart,
        setCart,
      }}
    >
      {children}
    </cartContext.Provider>
  );
}

export function useCart() {
  return useContext(cartContext);
}

export default cartContext;
