import React, { createContext, useCallback, useContext, useMemo } from "react";
import Cookies from "js-cookie";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { useCookieStorage } from "./useCookieStorage";
import { useDispatch } from "react-redux";
import { setUserLogin } from "../views/auth/authSlice";
import { decodeAccessToken } from "../routes/helpers";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useCookieStorage("user", null, true);
  const [token, setToken] = useCookieStorage("adminAuthToken", null);
  const [userRole] = useCookieStorage("userRole", "ADMIN");

  const navigate = useNavigate();
  const dispatch = useDispatch();

  const logout = useCallback(async () => {
    setUser(null);
    setToken(null);
    Cookies.set("adminRefreshToken", null, {
      expires: 7,
      secure: true,
      sameSite: "Strict",
    });
    dispatch(setUserLogin(false));
    navigate("/auth/login", { replace: true });
  }, [setToken, setUser, navigate, dispatch]);

  const login = useCallback(async () => {
    const decodedToken = decodeAccessToken(token);
    let isValidRole = decodedToken && decodedToken?.role?.find((role) => role.toUpperCase() === userRole);
    if (isValidRole) {
      setUser(decodedToken, true);
      dispatch(setUserLogin(true));
      navigate("/dashboard");
    } else {
      logout();
      toast.error(`You do not have the necessary privilege to access ${userRole.toLowerCase()}`);
    }
  }, [token, dispatch, navigate, logout, userRole, setUser]);

  const getUserRole = useCallback(() => {
    try {
      const role = Cookies.get("userRole");
      if (!role || role === "undefined" || role === "null") return null;
      return role.toUpperCase();
    } catch (e) {
      return null;
    }
  }, []);

  const value = useMemo(() => ({ user, login, logout, userRole, getUserRole, token }), [user, login, logout, userRole, getUserRole, token]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  return useContext(AuthContext);
};
