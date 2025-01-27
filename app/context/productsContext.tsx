import { createContext, ReactNode, useState, useContext, Dispatch, SetStateAction, useEffect } from "react";

import { Prices, Product } from "@/app/types/productsTypes";
import { formatOptions } from "@/app/utils/productFunctions";
import { useSse } from "@/app/context/sseContext";
import { useCart } from "@/app/context/cartContext";
import { useAlerts } from "@/app/context/alertsContext";
import { v4 as uuid } from "uuid";

export interface FormatedProduct {
  id: string;
  name: string;
  slug: string;
  category: string;
  pricesPer: string;
  productOptions: Prices;
  image: { url: string; alt: string };
  productUrl: string;
  ratings: { amount: number; value: number };
  relatedProducts: Product[];
  stock: string;
  option: string; // Selected option (see ProductOptions.tsx)
  price: string; // Displayed price (see ProductPrice.tsx)
  formatedOptions: ({
    option: string;
    price: string;
  } | null)[]; // Available options related to stock (see productFunction.ts => formatOptions)
}

interface ProductsAPIResponse {
  [productId: string | number]: Product;
}

interface ProductsFromContext {
  [productId: string | number]: FormatedProduct;
}

interface ProductsContext {
  products: ProductsFromContext;
  setProducts: Dispatch<SetStateAction<ProductsFromContext>>;
  updateProduct: (productId: string | number, updates: Partial<FormatedProduct>) => void;
}

const productsContext = createContext({} as ProductsContext);

const baseUrl = "https://api.monplancbd.fr/products";

export function ProductsProvider({ children }: { children: ReactNode }): JSX.Element {
  const [products, setProducts] = useState<ProductsFromContext>({});
  const [areProductsReady, setAreProductsReady] = useState(false);
  const { sseData } = useSse();
  const { cart, setCart } = useCart();
  const { addAlert } = useAlerts();

  const updateProduct = (productId: string | number, updates: Partial<FormatedProduct>) => {
    setProducts((prevProducts) => {
      return {
        ...prevProducts,
        [productId]: {
          ...prevProducts[productId],
          ...updates,
        },
      };
    });
  };

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch(baseUrl);
        const data: ProductsAPIResponse = await response.json();

        const transformedProducts = Object.values(data).reduce((acc: ProductsFromContext, product: Product) => {
          if (Array.isArray(product) || !Object.entries(product.prices).length) {
            return acc;
          }

          acc[product.id] = {
            id: product.id,
            name: product.name,
            slug: product.slug,
            category: product.category,
            pricesPer: product.pricesPer,
            productOptions: product.prices,
            image: {
              url: product.images?.main?.url || "",
              alt: product.images?.main?.alt || "",
            },
            productUrl: product.productUrl,
            ratings: { amount: product.ratings.amount, value: product.ratings.value },
            relatedProducts: product.relatedProducts,
            option: Object.entries(product.prices)[0][0],
            price: Object.entries(product.prices)[0][1],
            formatedOptions: formatOptions(product.prices, product.stock),
            stock: product.stock,
          };

          return acc;
        }, {} as ProductsFromContext);

        setProducts(transformedProducts);
        setAreProductsReady(true);
      } catch (error) {
        setAreProductsReady(false);
        console.error("Failed to fetch products:", error);
      }
    };

    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const _productsCartStock: { [productId: string | number]: number } = {};

    cart.products.forEach((cartProduct) => {
      // if the productId exists in product stock, increment the quantity instead of adding a new key.
      // It is necessary because it has to compute the quantity (in g or unit) inside the cart
      // for example, the cart could contain trim 2x10g and trim 1x50g. The result is { [trimId]: 70 }
      if (cartProduct.id in _productsCartStock) {
        _productsCartStock[cartProduct.id] = _productsCartStock[cartProduct.id] + cartProduct.quantity * parseInt(cartProduct.option);
      } else {
        _productsCartStock[cartProduct.id] = cartProduct.quantity * parseInt(cartProduct.option);
      }
    });

    // Check if products in cart still exists in products from sse
    // If the product does not exist in the db (from sse), it removes it from the cart
    Object.keys(_productsCartStock).forEach((productId) => {
      if (sseData && !(productId in sseData.stocks)) {
        const description = `Il n'y a plus de stock pour le produit ${productId}. Il a ete enleve de votre panier`;
        addAlert(uuid(), description, "Produit n'est plus disponible", "red");

        setCart((prevCart) => ({
          ...prevCart,
          products: prevCart.products.filter((product) => product.id != productId),
        }));

        delete _productsCartStock[productId];
      }
    });

    // Check for each product in the cart if the quantity (in g or unit) is still available in the db (from sse)
    if (sseData && !!Object.keys(_productsCartStock).length && !!Object.keys(sseData.stocks) && !!cart.products.length) {
      Object.entries(_productsCartStock).forEach(([productId, stock]) => {
        if (sseData.stocks[productId] < stock) {
          let delta = stock - sseData.stocks[productId];
          const products = cart.products.filter((product) => product.id == productId).toSorted((a, b) => parseInt(a.option) + parseInt(b.option));
          // const cartItemIdToRemove: string[] = [];
          const cartItemIdToRemove: { [cartItemId: string]: string } = {};

          products.forEach((product) => {
            if (delta > 0) {
              cartItemIdToRemove[product.cartItemId] = product.cartItemId;
              delta -= product.quantity * parseInt(product.option);
            }
          });

          products.forEach((product) => {
            if (product.cartItemId in cartItemIdToRemove) {
              const description = `${product.option} ${product.per} du produit ${product.name} retiré du panier`;
              addAlert(uuid(), description, "Retrait de produit du panier", "red");
            }
          });

          setCart((prevCart) => ({
            ...prevCart,
            products: prevCart.products.filter((product) => !(product.cartItemId in cartItemIdToRemove)),
          }));
        }
      });
    }

    // Every time the cart changes, the product's stock, formatedOptions, price (displayed price in the ui) and option (selected option)
    // has to be recomputed. The "isProductInCart" variable is here to check if a specific product is in the cart to compute the stock.
    if (sseData && !!Object.keys(products).length) {
      Object.entries(sseData.stocks).forEach(([productId, stockFromSse]) => {
        if (productId in products) {
          const isProductInCart = productId in _productsCartStock;
          const computedStock = isProductInCart ? stockFromSse - _productsCartStock[productId] : stockFromSse;

          const formatedOptions = formatOptions(products[productId].productOptions, computedStock.toString());

          const l = formatedOptions.length;
          const doesFormatedOptionsHasPrice = formatedOptions.some((formatedOption) => formatedOption?.price === products[productId].price);
          const doesFormatedOptionHasOption = formatedOptions.some((formatedOption) => formatedOption?.option === products[productId].option);

          setProducts((prevProducts) => ({
            ...prevProducts,
            [productId]: {
              ...prevProducts[productId],
              price: !doesFormatedOptionsHasPrice ? formatedOptions[l - 1].price : prevProducts[productId].price,
              option: !doesFormatedOptionHasOption ? formatedOptions[l - 1].option : prevProducts[productId].option,
              stock: computedStock.toString(),
            },
          }));
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart.products, areProductsReady, sseData?.stocks]);

  return (
    <productsContext.Provider
      value={{
        products,
        setProducts,
        updateProduct,
      }}
    >
      {children}
    </productsContext.Provider>
  );
}

export function useProducts() {
  return useContext(productsContext);
}

export default productsContext;
