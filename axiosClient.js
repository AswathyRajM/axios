import axios from "axios";
import Cookies from "js-cookie";
import { SERVICE_URL, EXCLUDED_URLS_FROM_JWT } from "../routes/config";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { useEffect, useState } from "react";
import { setUserLogin } from "../views/auth/authSlice";
import { decodeAccessToken } from "../routes/helpers";

const axiosClient = axios.create({
  baseURL: SERVICE_URL, // API base URL
});

// Add a request interceptor
axiosClient.interceptors.request.use(
  (config) => {
    // Check if the request URL is not in the excluded APIs
    if (!EXCLUDED_URLS_FROM_JWT.some((url) => config.url.includes(url))) {
      // Attach the JWT token to the request header
      const token = Cookies.get("adminAuthToken");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      } else {
        console.error("JWT token not found in cookies");
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

const AxiosInterceptor = ({ children }) => {
  const dispatch = useDispatch();
  const [isSet, setIsSet] = useState(false);
  const { isLogin } = useSelector((state) => state.auth);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [failedRequestsQueue, setFailedRequestsQueue] = useState([]);

  useEffect(() => {
    const resInterceptor = (response) => response;

    const errInterceptor = async (error) => {
      const originalRequest = error.config;
      if (error.response && error.response.status === 401 && isLogin && !originalRequest._retry) {
        originalRequest._retry = true;

        if (!isRefreshing) {
          setIsRefreshing(true);
          const oldAccessToken = Cookies.get("adminAuthToken");
          const refreshToken = Cookies.get("adminRefreshToken");

          try {
            const decodedAccessToken = decodeAccessToken(oldAccessToken);

            const response = await axiosClient.post(`/user/refreshToken`, { refreshToken, sessionId: decodedAccessToken.sessionId });
            const newToken = response.data.result.result;

            // Ensure token is set in Cookies before retrying
            Cookies.set("adminAuthToken", newToken, { expires: 1, secure: true, sameSite: "Strict" });
            axiosClient.defaults.headers.common.Authorization = `Bearer ${newToken}`;

            originalRequest.headers.Authorization = `Bearer ${newToken}`;

            // Retry all failed requests
            failedRequestsQueue.forEach((req) => req.resolve(newToken));
            setFailedRequestsQueue([]);
            setIsRefreshing(false);

            return axiosClient(originalRequest);
          } catch (refreshError) {
            failedRequestsQueue.forEach((req) => req.reject(refreshError));
            setFailedRequestsQueue([]);
            console.log({ refreshError });
            if (refreshError.response && refreshError.response.status === 401) {
              dispatch(setUserLogin(false));
              toast.error("Session expired. Please login", { hideProgressBar: true, toastId: "sessionerror" });
            }
            setIsRefreshing(false);
            return Promise.reject(refreshError);
          }
        } else {
          return new Promise((resolve, reject) => {
            setFailedRequestsQueue((prevQueue) => [...prevQueue, { resolve, reject }]);
          })
            .then((token) => {
              originalRequest.headers["Authorization"] = `Bearer ${token}`;
              return axiosClient(originalRequest);
            })
            .catch((err) => {
              return Promise.reject(err);
            });
        }
      }
      return Promise.reject(error?.response?.data || error);
    };

    const interceptor = axiosClient.interceptors.response.use(resInterceptor, errInterceptor);
    setIsSet(true);

    return () => axiosClient.interceptors.response.eject(interceptor);
  }, [dispatch, isLogin, isRefreshing, failedRequestsQueue]);

  return isSet && children;
};

export default axiosClient;
export { AxiosInterceptor };
