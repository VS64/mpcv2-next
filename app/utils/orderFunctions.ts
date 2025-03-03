import { DiscountCode } from "@/app/types/sseTypes";
import { ProductCart } from "@/app/context/productsAndCartContext";
import { DiscountApplied } from "@/app/types/orderTypes";

export const computePercentDiscount = (d: DiscountApplied, products: ProductCart[]) => {
  const { discountValue, nbItemsLimit, requiredProducts, requiredCategories, excludedProducts, excludedCategories } = d;

  // Convert discountValue to a number
  const discountPercent = parseFloat(discountValue) / 100;

  // Filter products based on requiredProducts, requiredCategories, excludedProducts, and excludedCategories
  let eligibleProducts = products.filter((product) => {
    // Check if the product is excluded
    if (excludedProducts.includes(product.id.toString()) || excludedCategories.includes(product.categoryId)) {
      return false;
    }

    // Check if the product is required
    if (requiredProducts.length > 0 && !requiredProducts.includes(product.id.toString())) {
      return false;
    }

    // Check if the product belongs to a required category
    if (requiredCategories.length > 0 && !requiredCategories.includes(product.categoryId)) {
      return false;
    }

    return true;
  });

  if (!nbItemsLimit) return eligibleProducts.reduce((sum, product) => sum + product.totalPrice * discountPercent, 0);

  // Treat each item as a separate unit
  let expandedProducts: ProductCart[] = [];
  eligibleProducts.forEach((product) => {
    for (let i = 0; i < product.quantity; i++) {
      expandedProducts.push({ ...product, quantity: 1, totalPrice: product.unitPrice });
    }
  });

  // Sort expandedProducts products by unitPrice in descending order
  expandedProducts.sort((a, b) => b.unitPrice - a.unitPrice);

  const limitedProducts = expandedProducts.slice(0, nbItemsLimit);

  return limitedProducts.reduce((sum, product) => sum + product.totalPrice * discountPercent, 0);
};

export const computeFixedProductDiscount = (d: DiscountApplied, products: ProductCart[]) => {
  const { discountValue, nbItemsLimit, requiredProducts, requiredCategories, excludedProducts, excludedCategories } = d;

  // Convert discountValue to a number
  const discount = parseFloat(discountValue);

  // Filter products based on requiredProducts, requiredCategories, excludedProducts, and excludedCategories
  let eligibleProducts = products.filter((product) => {
    // Check if the product is excluded
    if (excludedProducts.includes(product.id.toString()) || excludedCategories.includes(product.categoryId)) {
      return false;
    }

    // Check if the product is required
    if (requiredProducts.length > 0 && !requiredProducts.includes(product.id.toString())) {
      return false;
    }

    // Check if the product belongs to a required category
    if (requiredCategories.length > 0 && !requiredCategories.includes(product.categoryId)) {
      return false;
    }

    return true;
  });

  // Treat each item as a separate unit
  let expandedProducts: ProductCart[] = [];
  eligibleProducts.forEach((product) => {
    for (let i = 0; i < product.quantity; i++) {
      expandedProducts.push({ ...product, quantity: 1, totalPrice: product.unitPrice });
    }
  });

  if (!nbItemsLimit) return expandedProducts.length * discount;

  const limitedProducts = expandedProducts.slice(0, nbItemsLimit);

  return limitedProducts.length * discount;
};

/**
 * HT = TTC / (1 + (VATRate/100))
 * TVA = TTC - HT
 *
 * netPrice = prix hors taxe
 * VATRate = taux de TVA
 * VAT = TVA
 *
 * Calcul TVA après application réduction code promotion
 *
 * etape 1:
 *
 * Prix TTC ajusté = total panier - réduction
 *
 * étape 2:
 *
 * Proportion TVA = TVA / total panier
 *
 * étape 3:
 *
 * TVA ajustée = Prix TTC ajusté * proportion TVA
 *
 * étape 4:
 *
 * Net Total ajusté = prix TTC ajusté - TVA ajustée
 *
 */

export const computeVAT = (c: { total: number; products: ProductCart[] }, discount: number) => {
  const tot = c.total;
  const VAT = c.products.reduce((VAT, prod) => VAT + (prod.totalPrice - prod.totalPrice / (1 + prod.VATRate / 100)), 0);
  const adjustedTot = tot - discount;
  const VATPropotion = VAT / tot;
  const adjustedVAT = adjustedTot * VATPropotion;

  return adjustedVAT;
};
