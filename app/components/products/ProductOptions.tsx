"use client";

import { useAlerts } from "@/app/context/alertsContext";
import { ProductCart, useCart } from "@/app/context/cartContext";
import { useProducts } from "@/app/context/productsContext";
import { Image, Prices } from "@/app/types/productsTypes";
import { Field, Radio, RadioGroup } from "@headlessui/react";
import { PlusIcon, ShoppingBagIcon } from "@heroicons/react/20/solid";
import clsx from "clsx";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Fragment, useMemo } from "react";
import { twMerge } from "tailwind-merge";
import { v4 as uuid } from "uuid";

interface Params {
  image: Image;
  pricesPer: string;
  prices: Prices;
  name: string;
  id: string;
  stock: string;
  slug: string;
  category: string;
}

// This Component is used to display the product's option but is also used as a gateway into client features like contexts.
export default function ProductOptions({ prices, pricesPer, name, id, image, stock, slug, category }: Params) {
  const { products, updateProduct } = useProducts();

  const t = useTranslations("category");
  const { setCart } = useCart();
  const { addAlert } = useAlerts();
  const params = useParams();

  const hasStockAvailable = useMemo(() => {
    return !!products[id] ? parseInt(products[id].stock) > 0 : false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products[id]?.stock]);

  const addProductToCart = () => {
    const productBeingAddedToCart: ProductCart = {
      cartItemId: uuid(),
      id: id,
      name: products[id].name,
      quantity: 1,
      option: products[id].option,
      per: products[id].pricesPer,
      unitPrice: parseFloat(products[id].productOptions[products[id].option]),
      totalPrice: 0,
      image,
    };

    // Two posibilities here, either the same product with the same option already exists
    // in the cart, which means the quantity and the total price has to be update incremented
    // or it is a new product (can be the same product with different option) then it just has
    // to be added to the cart.
    setCart((prevCart) => {
      // Check if the same product and option is already in the cart
      const isSameProductAndOptionInCart = prevCart.products?.some(
        (product) => product.id === id && product.option === productBeingAddedToCart.option
      );

      if (isSameProductAndOptionInCart) {
        // If the same product with the same option is in the cart, increment the quantity
        // and compute de price
        const updatedCartProducts = prevCart.products.map((product) => {
          if (product.id === id && product.option === productBeingAddedToCart.option) {
            return {
              ...product,
              quantity: product.quantity + 1,
              totalPrice: (product.quantity + 1) * product.unitPrice,
            };
          }
          return product;
        });

        return { ...prevCart, products: updatedCartProducts };
      } else {
        productBeingAddedToCart.totalPrice = productBeingAddedToCart.unitPrice * productBeingAddedToCart.quantity;

        return {
          ...prevCart,
          products: [...prevCart.products, productBeingAddedToCart],
        };
      }
    });

    // Triggers an alert to give feedback to the user when he adds a product in the cart
    const alertDescription = `${products[id].option} ${pricesPer} du produit ${name} a bien ete ajoute`;
    addAlert(uuid(), alertDescription, "Ajout de produit", "emerald");
  };

  const handleSelectOption = (value: string) => {
    updateProduct(id, { option: value, price: products[id].productOptions[value] });
  };

  return !!products[id] ? (
    <div>
      {/* Option picker */}
      <fieldset aria-label="Choose a size" className="mt-2 sm:mt-6 pr-3 sm:pr-0">
        <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{pricesPer === "g" ? t("quantity") : t("unit")}</div>

        <RadioGroup value={products[id].option} onChange={handleSelectOption} className="mt-2 flex gap-1 sm:gap-2 sm:flex-wrap">
          {products[id].formatedOptions.map(
            (option) =>
              option && (
                <Field key={option.option} disabled={parseInt(products[id].stock) < parseInt(option.option)}>
                  <Radio as={Fragment} value={option.option}>
                    {({ checked, disabled, focus, hover }) => (
                      <span
                        className={twMerge(
                          clsx(
                            "relative p-1 w-8 h-8 text-xs cursor-pointer flex items-center justify-center rounded-md border border-gray-200 bg-white uppercase text-neutral-900",
                            "sm:p-2 sm:w-10 sm:h-10 sm:font-medium",
                            { "border-transparent bg-green text-white hover:bg-dark-green": checked },
                            { "ring-2 ring-green ring-offset-2 outline-none": focus },
                            { "bg-neutral-200": hover },
                            { "cursor-not-allowed bg-neutral-400 text-neutral-900": disabled }
                          )
                        )}
                      >
                        {option.option}
                      </span>
                    )}
                  </Radio>
                </Field>
              )
          )}
        </RadioGroup>
      </fieldset>

      {/* ADD CART BUTTON TABLET AND BIGGER SCREEN */}
      <div className="hidden sm:flex sm:flex-col sm:items-center sm:justify-center">
        <button
          onClick={addProductToCart}
          disabled={parseInt(products[id].stock) <= 0}
          className={twMerge(
            clsx(
              "mt-8 px-8 py-3 text-base font-medium flex w-full items-center justify-center rounded-md border border-transparent 2xl:w-2/3 text-white",
              { "bg-green hover:bg-dark-green focus:outline-none focus:ring-2 focus:ring-green focus:ring-offset-2": hasStockAvailable },
              { "cursor-not-allowed bg-neutral-400": !hasStockAvailable }
            )
          )}
        >
          {t("addToCart")}
        </button>
        {/* This condition is here to remove the "details" when on the single product page */}
        {!("productSlug" in params) && (
          <p className="text-center my-4">
            <Link href={`/${category}/${slug}`} className="font-medium text-green hover:text-light-green underline">
              {t("details")}
            </Link>
          </p>
        )}
      </div>

      {/* ADD CART BUTTON SMARTPHONE */}
      <div className="mt-4 flex justify-between items-center pr-3 sm:hidden">
        {/* This condition is here to remove the "details" when on the single product page */}
        {!("productSlug" in params) ? (
          <p className="text-center my-4">
            <Link href={`/${category}/${slug}`} className="font-medium text-green hover:text-light-green underline pl-1">
              {t("details")}
            </Link>
          </p>
        ) : (
          <div></div>
        )}
        <button onClick={addProductToCart} className="relative" disabled={!hasStockAvailable}>
          {hasStockAvailable && <PlusIcon className="absolute top-0 -right-0.5 w-4 h-4 text-white z-[2]" />}
          <ShoppingBagIcon
            className={twMerge(clsx("w-10 h-10 p-1 rounded-md text-white bg-green z-[1]", { "bg-neutral-400": !hasStockAvailable }))}
          />
        </button>
      </div>
    </div>
  ) : (
    <div className="mt-2 sm:mt-6 pr-3 sm:pr-0">
      <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{pricesPer === "g" ? t("quantity") : t("unit")}</div>
      <div className="mt-2 flex gap-1 sm:gap-2 sm:flex-wrap">
        {new Array(1).fill(0).map((_, i) => (
          <div
            key={`${i}-key`}
            className={clsx(
              "relative p-1 w-8 h-8 text-xs cursor-pointer flex items-center justify-center rounded-md border border-gray-200 bg-white uppercase text-neutral-900 animate-pulse",
              "sm:p-2 sm:w-10 sm:h-10 sm:font-medium"
            )}
          ></div>
        ))}
      </div>
      <div className="hidden sm:flex sm:flex-col sm:items-center sm:justify-center">
        <button
          onClick={addProductToCart}
          disabled
          className={twMerge(
            clsx(
              "mt-8 px-8 py-3 text-base font-medium flex w-full items-center justify-center rounded-md border border-transparent 2xl:w-2/3 text-neutral-400 animate-pulse",
              { "bg-green hover:bg-dark-green focus:outline-none focus:ring-2 focus:ring-green focus:ring-offset-2": hasStockAvailable },
              { "cursor-not-allowed bg-neutral-400": !hasStockAvailable }
            )
          )}
        >
          {t("addToCart")}
        </button>
        {/* This condition is here to remove the "details" when on the single product page */}
        {!("productSlug" in params) && (
          <p className="text-center my-4">
            <Link href={`/${category}/${slug}`} className="font-medium text-green hover:text-light-green underline">
              {t("details")}
            </Link>
          </p>
        )}
      </div>
      <div className="mt-4 flex justify-between items-center sm:hidden">
        {/* This condition is here to remove the "details" when on the single product page */}
        {!("productSlug" in params) ? (
          <p className="text-center my-4">
            <Link href={`/${category}/${slug}`} className="font-medium text-green hover:text-light-green underline pl-1">
              {t("details")}
            </Link>
          </p>
        ) : (
          <div></div>
        )}
        <button onClick={addProductToCart} className="relative animate-pulse" disabled={!hasStockAvailable}>
          <ShoppingBagIcon className={twMerge(clsx("w-10 h-10 p-1 rounded-md text-white bg-neutral-400 z-[1]"))} />
        </button>
      </div>
    </div>
  );
}
