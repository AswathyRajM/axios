import Cookies from "js-cookie";
import { useState } from "react";

export const useCookieStorage = (key, value, isObject = false) => {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const currentValue = Cookies.get(key);

      if (isObject && currentValue && currentValue !== "undefined" && currentValue !== "null") {
        return JSON.parse(currentValue);
      }

      let newValue;
      if (value !== "undefined" && value !== "null") {
        newValue = isObject ? JSON.stringify(value) : currentValue;
      } else newValue = null;

      Cookies.set(key, newValue, {
        expires: 7,
        secure: true,
        sameSite: "Strict",
      });

      return value;
    } catch (e) {
      console.log({ e });
      return value;
    }
  });

  const setValue = (newValue, isObject) => {
    setStoredValue(newValue);
    try {
      const value = isObject ? JSON.stringify(newValue) : newValue;
      Cookies.set(key, value, {
        expires: 7,
        secure: true,
        sameSite: "Strict",
      });
    } catch (e) {
      console.log({ e });
    }
  };
  return [storedValue, setValue];
};
