"use server";

import { Address, UpdateAddressResponse, UserDataAPIResponse } from "@/app/types/profileTypes";
import { cookies } from "next/headers";
import { fetchWrapper } from "@/app/utils/fetchWrapper";
import { billingAddress, Order, shippingAddress, SipsFailResponse, SipsSuccessResponse } from "@/app/types/orderTypes";
import { generatePaymentToken } from "@/app/utils/auth";
interface ErrorReponse {
  message: string;
  statusCode: number;
  errorData: any;
}

interface IComment {
  review: string;
  rating: number;
}

interface IUser {
  mail: string;
  password: string;
  firstname: string;
  lastname: string;
  optInMarketing: boolean;
  shippingAddress: shippingAddress | null;
  billingAddress: billingAddress | null;
  referralToken: string | null;
}

export type statusCode = 0 | 200 | 201 | 204 | 400 | 401 | 404 | 409 | 422 | 500;
export type data = null | UserDataAPIResponse | Address | { id: string } | {};

export interface IResponseAPI {
  message: string;
  data: data;
  isSuccess: boolean;
  statusCode: statusCode;
}

function responseAPI(message: string, data: data, isSuccess: boolean, statusCode: statusCode) {
  return { message, data, isSuccess, statusCode };
}

/**
 * status code:
 *  200: success, send {message, data, isSuccess, status code: 200}, redirect to "/"
 *  204: user does not exist {message, null, isSuccess, status code: 204}, redirect to "/inscription?email=user@mail.com"
 *  401: wrong password {message, null, !isSuccess, statusCode: 401}
 *  500: error server {message, null, !isSuccess, statusCode: 500}
 */
export async function login(stringifiedData: string) {
  try {
    const user: { username: string; password: string } = JSON.parse(stringifiedData);

    const fetchOptions = {
      method: "POST",
      body: JSON.stringify(user),
      headers: {
        "Content-Type": "application/json",
      },
    };

    const response = await fetch(`${process.env.API_HOST}/login`, fetchOptions);

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw {
        message: `Error while logging in. Status code: ${response.status}`,
        statusCode: response.status,
        errorData,
      };
    } else if (response.ok && response.status === 204) {
      return responseAPI("User does not exist, you will get redirected", user.username, true, response.status);
    }

    const userData: UserDataAPIResponse = await response.json();

    const domain = process.env.NODE_ENV === "development" ? "localhost" : process.env.MAIN_DOMAIN;
    const cookieOptions = { httpOnly: true, secure: true, sameSite: "strict" as const, path: "/", domain };

    cookies().set("accessToken", userData.accessToken, cookieOptions);
    cookies().set("refreshToken", userData.refreshToken, cookieOptions);

    return responseAPI("User successfully logged in", userData, true, response.status as 200);
  } catch (error: any | ErrorReponse) {
    console.error("Login error:", error);

    const statusCode = error.statusCode || 500;
    const errorMessage = error.message || "Error while logging in";

    return responseAPI(errorMessage, null, false, statusCode);
  }
}

export async function logout() {
  try {
    const accessToken = cookies().get("accessToken")?.value ?? "";

    const fetchOptions = { method: "GET", headers: { Authorization: accessToken, "Content-Type": "application/json" } };

    await fetch(`${process.env.API_HOST}/logout`, fetchOptions);

    cookies().delete("accessToken");
    cookies().delete("refreshToken");

    return { message: "User successfully logged out", data: null, isSuccess: true };
  } catch (error) {
    console.error(error);
    return { message: "Error while logging out", data: null, isSuccess: false };
  }
}

/**
 * status code:
 *  200: success, send {message, data, isSuccess, status code: 200}, redirect to "/"
 *  409: user already exists {message, null, !isSuccess, statusCode: 409} redirect to "/connexion"
 *  500: error server {message, null, !isSuccess, statusCode: 500}
 */

interface User {
  firstname: string;
  lastname: string;
  email: string;
  password: string;
  optInMarketing: boolean;
  referralToken: string | null;
}

export async function register(stringifiedData: string, formData?: FormData) {
  try {
    const parsedUser: User = JSON.parse(stringifiedData);

    const shippingAddress: shippingAddress | undefined = formData ? JSON.parse(formData.get("shipping-address") as string) : undefined;
    const billingAddress: billingAddress | undefined = formData ? JSON.parse(formData.get("billing-address") as string) : undefined;
    const isDifferentBilling: boolean | undefined = formData ? !!formData.get("different-billing") : undefined;

    const user: IUser = {
      mail: parsedUser.email,
      password: parsedUser.password,
      firstname: parsedUser.firstname,
      lastname: parsedUser.lastname,
      optInMarketing: parsedUser.optInMarketing,
      shippingAddress: !!shippingAddress ? shippingAddress : null,
      billingAddress: !!billingAddress ? billingAddress : null,
      referralToken: parsedUser.referralToken,
    };

    if (isDifferentBilling !== undefined && billingAddress && shippingAddress && !isDifferentBilling) {
      for (const key in shippingAddress) {
        if (key !== "order-notes") {
          billingAddress[key as keyof billingAddress] = shippingAddress[key as keyof shippingAddress];
        }
      }
    }

    const fetchOptions = {
      method: "POST",
      body: JSON.stringify(user),
      headers: {
        "Content-Type": "application/json",
      },
    };

    const response = await fetch(`${process.env.API_HOST}/register`, fetchOptions);

    if (!response.ok && response.status === 409) {
      return responseAPI("User already exists", user.mail, false, response.status);
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw {
        message: `Error while signing up. Status code: ${response.status}`,
        statusCode: response.status,
        errorData,
      };
    }

    const userData: UserDataAPIResponse = await response.json();

    const domain = process.env.NODE_ENV === "development" ? "localhost" : process.env.MAIN_DOMAIN;
    const cookieOptions = { httpOnly: true, secure: true, sameSite: "strict" as const, path: "/", domain };

    cookies().set("accessToken", userData.accessToken, cookieOptions);
    cookies().set("refreshToken", userData.refreshToken, cookieOptions);

    return responseAPI("User successfully signed up", userData, true, response.status as 200);
  } catch (error: any | ErrorReponse) {
    console.error("Sign up error:", error);

    const statusCode = error.statusCode || 500;
    const errorMessage = error.message || "Error while logging in";

    return responseAPI(errorMessage, null, false, statusCode);
  }
}

/**
 * status code:
 *  200: success, send {message, data, isSuccess, status code: 200}
 *  400: invalid data {message, null, !isSuccess, statusCode: 400}
 *  401: unauthorized {message, null, !isSuccess, statusCode: 401}
 *  422: semantic error {message, null, !isSuccess, statusCode: 422}
 *  500: error server {message, null, !isSuccess, statusCode: 500}
 */

interface UpdateUser {
  firstname: string;
  lastname: string;
  mail: string;
  oldPassword: string;
  newPassword: string;
  optInMarketing: boolean;
  confirmNewPassword?: string;
}

export async function update(stringifiedData: string) {
  try {
    const user: UpdateUser = JSON.parse(stringifiedData);

    if ("confirmNewPassword" in user) {
      delete user.confirmNewPassword;
    }

    const fetchOptions = {
      method: "PUT",
      body: JSON.stringify(user),
      headers: {
        "Content-Type": "application/json",
      },
    };

    const response = await fetchWrapper(`${process.env.API_HOST}/user`, fetchOptions);

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw {
        message: `Error while updating user. Status code: ${response.status}`,
        statusCode: response.status,
        errorData,
      };
    }

    const userData: UserDataAPIResponse = await response.json();

    return responseAPI("User successfully updated", userData, true, response.status as 200);
  } catch (error: any | ErrorReponse) {
    console.error("Update error:", error);

    const statusCode = error.statusCode || 500;
    const errorMessage = error.message || "Error while logging in";

    return responseAPI(errorMessage, null, false, statusCode);
  }
}

/**
 * status code:
 *  200: success, send {message, data, isSuccess, status code: 200}
 *  400: invalid data {message, null, !isSuccess, statusCode: 400}
 *  401: unauthorized {message, null, !isSuccess, statusCode: 401}
 *  422: semantic error {message, null, !isSuccess, statusCode: 422}
 *  500: error server {message, null, !isSuccess, statusCode: 500}
 */

type addedAddress = Omit<Address, "id">;

export async function addAddress(stringifiedData: string) {
  try {
    const address: addedAddress = JSON.parse(stringifiedData);

    const fetchOptions = {
      method: "POST",
      body: JSON.stringify(address),
      headers: {
        "Content-Type": "application/json",
      },
    };

    const response = await fetchWrapper(`${process.env.API_HOST}/user/addresses/add`, fetchOptions);

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw {
        message: `Error while add address. Status code: ${response.status}`,
        statusCode: response.status,
        errorData,
      };
    }

    const addressResponse: Address = await response.json();

    return responseAPI("Address successfully added", addressResponse, true, response.status as 200);
  } catch (error: any | ErrorReponse) {
    console.error("Add address error:", error);

    const statusCode = error.statusCode || 500;
    const errorMessage = error.message || "Error while logging in";

    return responseAPI(errorMessage, null, false, statusCode);
  }
}

/**
 * status code:
 *  200: success, send {message, data, isSuccess, status code: 200}
 *  400: invalid data {message, null, !isSuccess, statusCode: 400}
 *  401: unauthorized {message, null, !isSuccess, statusCode: 401}
 *  500: error server {message, null, !isSuccess, statusCode: 500}
 */
export async function deleteAddress(stringifiedData: string) {
  try {
    const { id }: { id: string } = JSON.parse(stringifiedData);

    if (!id) {
      const errorData = null;
      throw {
        message: "The address id is required",
        statusCode: 400,
        errorData,
      };
    }

    const fetchOptions = {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    };

    const response = await fetchWrapper(`${process.env.API_HOST}/user/addresses/${id}`, fetchOptions);

    return responseAPI("Address successfully deleted", { id: id.toString() }, true, response.status as 200);
  } catch (error: any | ErrorReponse) {
    console.error("Delete address error:", error);

    const statusCode = error.statusCode || 500;
    const errorMessage = error.message || "Error while deleting address";

    return responseAPI(errorMessage, null, false, statusCode);
  }
}

export async function updateAddress(stringifiedData: string) {
  try {
    const { address, id }: { address: Address; id: string } = JSON.parse(stringifiedData);

    if (!id) {
      const errorData = null;
      throw {
        message: "The address id is required",
        statusCode: 400,
        errorData,
      };
    }

    const fetchOptions = {
      method: "PUT",
      body: JSON.stringify(address),
      headers: {
        "Content-Type": "application/json",
      },
    };

    const response = await fetchWrapper(`${process.env.API_HOST}/user/addresses/${id}`, fetchOptions);

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw {
        message: `Error while add address. Status code: ${response.status}`,
        statusCode: response.status,
        errorData,
      };
    }

    const addressResponse: Address = await response.json();

    return responseAPI("Address successfully updated", addressResponse as unknown as UpdateAddressResponse, true, response.status as 200);
  } catch (error: any | ErrorReponse) {
    console.error("Update address error:", error);

    const statusCode = error.statusCode || 500;
    const errorMessage = error.message || "Error while updating address";

    return responseAPI(errorMessage, null, false, statusCode);
  }
}

/**
 * status code:
 *  204: success, send {message, null, isSuccess, status code: 204}
 *  400: invalid data {message, null, !isSuccess, statusCode: 400}
 *  401: unauthorized {message, null, !isSuccess, statusCode: 401}
 *  500: error server {message, null, !isSuccess, statusCode: 500}
 */

export async function comment(prevState: IComment, formData: FormData) {
  try {
    const comment = {
      review: formData.get("comment"),
      rating: parseInt((formData.get("rating") as string) || "0"),
    };

    const { id } = {
      id: formData.get("id"),
    };

    if (!id) {
      const errorData = null;
      throw {
        message: "The product id is required",
        statusCode: 400,
        errorData,
      };
    }

    const fetchOptions = {
      method: "POST",
      body: JSON.stringify(comment),
      headers: {
        "Content-Type": "application/json",
      },
    };

    const response = await fetchWrapper(`${process.env.API_HOST}/product/${id}/add-comment`, fetchOptions);

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw {
        message: `Error while adding comment. Status code: ${response.status}`,
        statusCode: response.status,
        errorData,
      };
    }

    return responseAPI("Comment added successfully", null, true, response.status as 204);
  } catch (error: any | ErrorReponse) {
    console.error("Add comment error:", error);

    const statusCode = error.statusCode || 500;
    const errorMessage = error.message || "Error while adding comment";

    return responseAPI(errorMessage, null, false, statusCode);
  }
}

/**
 * 204: success no content {message, null, isSuccess, status code: 204}
 * 409: password recovery failed {message, null, !isSuccess, statusCode: 409}
 */
export async function forgottenPassword(stringifiedData: string) {
  try {
    const email: { mail: string } = JSON.parse(stringifiedData);

    const fetchOptions = {
      method: "POST",
      body: JSON.stringify(email),
      headers: {
        "Content-Type": "application/json",
      },
    };

    const response = await fetch(`${process.env.API_HOST}/forgotten-password`, fetchOptions);

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw {
        message: `Error recovering password. Status code: ${response.status}`,
        statusCode: response.status,
        errorData,
      };
    }

    return responseAPI("Recover password successful", null, true, response.status as 204);
  } catch (error: any | ErrorReponse) {
    console.error("Recover password error:", error);

    const statusCode = error.statusCode || 500;
    const errorMessage = error.message || "Error while recovering password";

    return responseAPI(errorMessage, null, false, statusCode);
  }
}

export async function payment(stringifiedOrder: string) {
  try {
    const order: Order = JSON.parse(stringifiedOrder);

    if (!order["different-billing"]) {
      for (const key in order.shippingAddress) {
        if (key !== "order-notes") {
          order.billingAddress[key as keyof billingAddress] = order.shippingAddress[key as keyof shippingAddress];
        }
      }
    }

    const fetchOptions = {
      method: "POST",
      body: JSON.stringify(order),
      headers: {
        "Content-Type": "application/json",
      },
    };

    const response = await fetchWrapper(`${process.env.API_HOST}/order/init-payment`, fetchOptions);

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw {
        message: `Error payment. Status code: ${response.status}`,
        statusCode: response.status,
        errorData,
      };
    }

    const initPaymentData: ({ orderId: number } & SipsSuccessResponse) | ({ orderId: number } & SipsFailResponse) = await response.json();

    return responseAPI("Init payment successful", initPaymentData, true, response.status as 200);
  } catch (error: any | ErrorReponse) {
    console.error("payment error:", error);

    const statusCode = error.statusCode || 500;
    const errorMessage = error.message || "Error in payment";

    return responseAPI(errorMessage, null, false, statusCode);
  }
}

export async function bankTransfer(stringifiedOrder: string, orderId: number) {
  try {
    const order: Order = JSON.parse(stringifiedOrder);

    const fetchOptions = {
      method: "POST",
      body: JSON.stringify(order),
      headers: {
        "Content-Type": "application/json",
      },
    };

    const response = await fetchWrapper(`${process.env.API_HOST}/order/${orderId}/transfer-payment`, fetchOptions);

    if (response.status === 204) {
      const token = generatePaymentToken({ orderId, payment: "bankTransfer" });
      return responseAPI("Bank transfer call successful", token, true, response.status);
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw {
        message: `Error bank transfer payment. Status code: ${response.status}`,
        statusCode: response.status,
        errorData,
      };
    }

    return responseAPI("Something went wrong", null, false, 500);
  } catch (error: any | ErrorReponse) {
    console.error("payment error:", error);

    const statusCode = error.statusCode || 500;
    const errorMessage = error.message || "Error in payment";

    return responseAPI(errorMessage, null, false, statusCode);
  }
}
