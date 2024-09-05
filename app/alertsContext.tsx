"use client";

import {
  createContext,
  ReactNode,
  useState,
  useContext,
  useEffect,
} from "react";
import {
  ExclamationTriangleIcon,
  XCircleIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  XMarkIcon,
} from "@heroicons/react/20/solid";

import { v4 as uuid } from "uuid";
import clsx from "clsx";

interface AlertsContext {
  addAlert: (
    alertId: string,
    description: string,
    title: string,
    color: color
  ) => void;
}

const alertsContext = createContext({} as AlertsContext);

type color = "emerald" | "yellow" | "blue" | "red";

interface IAlertElement {
  alertId: string;
  description: string;
  title: string;
  color: color;
  closeAlert: (alertId: string) => void;
}

function AlertElement({
  alertId,
  color,
  description,
  title,
  closeAlert,
}: IAlertElement) {
  const [isClosing, setIsClosing] = useState(false);
  const [isFingerClosing, setIsFingerClosing] = useState(false);
  const [closeTime, setCloseTime] = useState(4000);

  const iconProps = {
    "aria-hidden": true,
    className: `h-5 w-5 text${color}400`,
  };

  useEffect(() => {
    const timeoutIdAnimate = setTimeout(() => {
      console.log("TimeoutAnimate");
      setIsClosing(true);
    }, closeTime - 500);

    const timeoutIdClose = setTimeout(() => {
      console.log("TimeoutClose");
      closeAlert(alertId);
    }, closeTime);

    // Clear timeout when component unmounts (or alert is manually closed)
    return () => {
      clearTimeout(timeoutIdClose);
      clearTimeout(timeoutIdAnimate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closeTime]);

  const icon = {
    emerald: <CheckCircleIcon {...iconProps} />,
    yellow: <ExclamationTriangleIcon {...iconProps} />,
    blue: <InformationCircleIcon {...iconProps} />,
    red: <XCircleIcon {...iconProps} />,
  };

  return (
    <div
      id={alertId}
      className={clsx(
        isFingerClosing
          ? "animate-fingerslideoutright"
          : isClosing
          ? "animate-slideoutright"
          : "animate-slideinright",
        `relative rounded-r-md bg${color}50 border-l-4 border${color}400 p-4 border-y border-r shadow-xl`
      )}
      onMouseEnter={() => {
        console.log("mouse enter");
        setCloseTime(60000);
      }} // when the mouse enters the element
      onTouchStart={() => {
        console.log("touch start");
        setCloseTime(60000);
      }} // when the user stay pressed
      onMouseLeave={() => {
        console.log("mouse leave");
        setCloseTime(1000);
      }} // when the mouse leaves the element
      onTouchEnd={() => {
        console.log("touch end");
        setCloseTime(1000);
      }}
      onTouchMove={() => {
        console.log("touch move");
        setIsFingerClosing(true);

        // This promised is used to trigger the closeAlert function after 500ms delay
        // It is necessary to let the closing animation running before the alert is removed from the state
        new Promise((resolve) => {
          const timeoutIdClose = setTimeout(() => {
            closeAlert(alertId);
            resolve(timeoutIdClose);
          }, 500);
        }).then((timeoutIdClose) =>
          clearTimeout(timeoutIdClose as NodeJS.Timeout)
        );
      }}
    >
      <div
        onClick={() => {
          setIsClosing(true);

          // This promised is used to trigger the closeAlert function after 500ms delay
          // It is necessary to let the closing animation running before the alert is removed from the state
          new Promise((resolve) => {
            const timeoutIdClose = setTimeout(() => {
              closeAlert(alertId);
              resolve(timeoutIdClose);
            }, 500);
          }).then((timeoutIdClose) =>
            clearTimeout(timeoutIdClose as NodeJS.Timeout)
          );
        }}
      >
        <span className="sr-only">Dismiss</span>
        <XMarkIcon
          aria-hidden="true"
          className={`absolute h-5 w-5 text${color}800 top-2 right-2 cursor-pointer rounded-md hover:bg${color}}100`}
        />
      </div>
      <div className="flex">
        <div className="flex-shrink-0">{icon[color]}</div>
        <div className="ml-3">
          <h3 className={`text-sm font-medium text${color}800`}>{title}</h3>
          <div className={`mt-2 text-sm text${color}700`}>
            <p>{description}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AlertsProvider({
  children,
}: {
  children: ReactNode;
}): JSX.Element {
  const [alerts, setAlerts] = useState<JSX.Element[]>([]);

  const closeAlert = (alertId: string) => {
    setAlerts((prevState) =>
      prevState.filter((alert) => alert.props.alertId !== alertId)
    );
  };

  const addAlert = (
    alertId: string,
    description: string,
    title: string,
    color: color
  ) => {
    const element = (
      <AlertElement
        key={alertId}
        alertId={alertId}
        description={description}
        title={title}
        color={color}
        closeAlert={closeAlert}
      />
    );
    setAlerts((prevState) => [...prevState, element]);
  };

  return (
    <alertsContext.Provider
      value={{
        addAlert,
      }}
    >
      <>
        {children}
        <div className="w-4/5 sm:w-3/5 xl:w-2/5 fixed right-5 top-20 flex flex-col gap-5">
          {alerts}
        </div>
      </>
    </alertsContext.Provider>
  );
}

export function useAlerts() {
  return useContext(alertsContext);
}

export default alertsContext;
