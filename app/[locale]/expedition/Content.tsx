"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { v4 as uuid } from "uuid";
import { useEffect, useRef, useState, FormEvent } from "react";
import clsx from "clsx";
import { ArrowLeftIcon } from "@heroicons/react/20/solid";
import { twMerge } from "tailwind-merge";
import { useTranslations } from "next-intl";

import Form from "@/app/components/shippingPage/Form";
import Total from "@/app/components/shippingPage/Total";
import OrderSummary from "@/app/components/shippingPage/OrderSummary";
import Shipping from "@/app/components/shippingPage/Shipping";
import AreYouCustomer from "@/app/components/cartPage/AreYouCustomer";
import Title from "@/app/components/Title";
import { data, statusCode, register } from "@/app/actions";
import { useOrder } from "@/app/context/orderContext";
import { useAlerts } from "@/app/context/alertsContext";
import { isUserDataAPIResponse } from "@/app/utils/typeGuardsFunctions";
import { useAuth } from "@/app/context/authContext";
import { buttonClassname } from "@/app/staticData/cartPageClasses";

interface IActionResponse {
  message: string;
  data: data;
  isSuccess: boolean;
  statusCode: statusCode;
}

export default function DisplayComponents() {
  const [isPending, setIsPending] = useState(false);
  const [actionResponse, setActionResponse] = useState<null | IActionResponse>(null);
  const form = useRef<HTMLFormElement>(null);

  const { order } = useOrder();
  const router = useRouter();
  const { addAlert } = useAlerts();
  const { userData, setUserData, referralToken } = useAuth();
  const t = useTranslations("");

  const handleAction = async (e: FormEvent<HTMLFormElement>) => {
    if (form.current) {
      e.preventDefault();
      try {
        if (!userData) {
          setIsPending(true);
          const formData = new FormData(form.current);
          formData.append("shipping-address", JSON.stringify(order.shippingAddress));
          formData.append("billing-address", JSON.stringify(order.billingAddress));

          const stringifiedUser = JSON.stringify({
            email: order.shippingAddress.email,
            password: order.password,
            firstname: order.shippingAddress.firstname,
            lastname: order.shippingAddress.lastname,
            optInMarketing: !!formData.get("optInMarketing") ? true : false,
            referralToken,
          });

          const response = await register(stringifiedUser, formData);
          setIsPending(false);
          setActionResponse(response);
        } else {
          router.push("/paiement");
        }
      } catch (error) {
        console.error("Error during form action:", error);
        setIsPending(false);
        addAlert(uuid(), t("alerts.accountCreation.genericError.text"), t("alerts.accountCreation.genericError.title"), "red");
      }
    }
  };

  useEffect(() => {
    if (actionResponse) {
      if (actionResponse.isSuccess && actionResponse.data && actionResponse.statusCode === 200) {
        if (isUserDataAPIResponse(actionResponse.data)) {
          if (!Array.isArray(actionResponse.data.addresses)) {
            actionResponse.data.addresses = [];
          }

          setUserData(actionResponse.data);
          addAlert(uuid(), t("alerts.accountCreation.success200.text"), t("alerts.accountCreation.success200.title"), "emerald");
          router.push("/paiement");
        } else {
          console.warn("Successful response but unexpected data format:", actionResponse.data);
          addAlert(uuid(), t("alerts.accountCreation.defaultError.text"), t("alerts.accountCreation.defaultError.title"), "yellow");
        }
      } else if (!actionResponse.isSuccess) {
        let textKey = "alerts.accountCreation.defaultError.text";
        let titleKey = "alerts.accountCreation.title";
        let color: "blue" | "red" | "yellow" = "red";

        switch (actionResponse.statusCode) {
          case 409:
            textKey = "alerts.accountCreation.error409.text";
            titleKey = "alerts.accountCreation.error409.title";
            color = "blue";
            setTimeout(() => router.push("/connexion?redirect=paiement"), 500);
            break;
          case 500:
            textKey = "alerts.accountCreation.error500.text";
            titleKey = "alerts.accountCreation.error500.title";
            color = "red";
            break;
        }
        const alertText = actionResponse.message || t(textKey);
        addAlert(uuid(), alertText, t(titleKey), color);
      }
      setActionResponse(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionResponse]);

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <Title
        title={t("shippingPage.h1")}
        type="h1"
        classname={`relative mb-6 text-center uppercase text-xl text-green font-bold tracking-widest`}
        firstLetterClassname="text-4xl"
      />

      <div className="mb-6">
        <Link
          href={"/panier"}
          className={twMerge(clsx(buttonClassname, "bg-white text-neutral-700 border border-neutral-300 hover:bg-neutral-50", "px-3 py-1.5 text-sm"))}
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1.5" aria-hidden="true" />
          {t("shippingPage.backToCartButton")}
        </Link>
      </div>

      <AreYouCustomer redirect="expedition" />

      <form ref={form} onSubmit={handleAction} className="lg:grid lg:grid-cols-12 lg:items-start lg:gap-x-8 xl:gap-x-12 mt-6">
        <div className="lg:col-span-7 space-y-6">
          <Form />
        </div>
        <div className="lg:col-span-5 mt-8 lg:mt-0 space-y-6">
          <OrderSummary />
          <Shipping />
          <Total isPending={isPending} />
        </div>
      </form>
    </div>
  );
}
