import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import Cookies from "js-cookie";
import axiosClient from "../../axios/axiosClient";
import { validateAccessToken, decodeAccessToken, setCookies } from "../../routes/helpers";

const ERR = "Some errors are occured, Please try after some time";

export const fetchProfile = createAsyncThunk("profile/fetchProfile", async (_, { dispatch }) => {
  const response = await axiosClient.get(`/getUserDetails`);
  const responseData = response.data.result.result.user;
  return responseData;
});

export const loginUserPass = createAsyncThunk("/loginUserPass", async (data, { dispatch }) => {
  const user = data.user;
  const payload = { ...data };
  delete payload.user;
  if (user === "admin") {
    const response = await axiosClient.post(`/user/adminLoginWithPassword`, payload);
    const responseData = response.data.result.result;
    return responseData;
  }
  const response = await axiosClient.post(`/user/agencyLoginWithPassword`, payload);
  const responseData = response.data.result.result;
  return responseData;
});

export const registerUserSSO = createAsyncThunk("/registerUserSSO", async (data) => {
  const user = data.activeTab;
  const payload = { ...data };
  delete payload.activeTab;
  if (user === "admin") {
    const response = await axiosClient.post(`/user/adminLoginWithSSO`, payload);
    const responseData = response.data.result.result;
    return responseData;
  }
  const response = await axiosClient.post(`/user/agencyLoginWithSSO`, payload);
  const responseData = response.data.result.result;
  return responseData;
});

export const verifyUserOtp = createAsyncThunk("/verifyUserOtp", async (data) => {
  const response = await axiosClient.post(`/user/verifyUserOtp`, data);
  const responseData = response.data.result.result;
  return responseData;
});

export const sendforgotPasswordOtp = createAsyncThunk("/forgotPasswordOtp", async (data) => {
  const response = await axiosClient.post(`/user/sendForgotPasswordOtp`, data);

  const responseData = response.data.result.result;
  return responseData;
});

export const verifyforgotPasswordOtp = createAsyncThunk("/verifyforgotPasswordOtp", async (data) => {
  const response = await axiosClient.post(`/user/verifyForgotPasswordOtp`, data);
  const responseData = response.data.result.result;
  return responseData;
});

export const changeLoginPassword = createAsyncThunk("/changeLoginPassword", async (data) => {
  const response = await axiosClient.post(`/user/changePassword`, data);
  const responseData = response.data.result.result;
  return responseData;
});

export const userLogout = createAsyncThunk('/userLogout', async (data) => {
  const response = await axiosClient.post(`/user/userLogout`, data);
  const responseData = response.data.result.result;
  return responseData;
});

export const getNewAuthToken = createAsyncThunk("/refreshToken", async (sessionId) => {
  const refreshToken = Cookies.get("adminRefreshToken");
  const response = await axiosClient.post(`/user/refreshToken`, { refreshToken, sessionId });
  const { accessToken } = response.data.result.result;

  Cookies.set("adminAuthToken", accessToken, {
    expires: 1,
    secure: true,
    sameSite: "Strict",
  });
});

const initialState = {
  isLogin: validateAccessToken(),
  isEmailVerified: false,
  currentUser: {},
  recoveryEmail: null,

  passwordLogin: {
    loading: false,
    error: null,
  },
  googleSSOLogin: {
    loading: false,
    error: null,
  },
  forgotPassword: {
    loading: false,
    error: null,
    otpSent: false,
    userId: null,
  },
  verifyOtp: {
    loading: false,
    error: null,
    otpVerified: false,
    otpResent: false,
    userId: null,
  },
  resetPassword: {
    loading: false,
    error: null,
    userId: null,
    success: false,
  },

  currentUserRole: "admin",
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setUserLogin(state, action) {
      const logged = action.payload;
      state.isLogin = logged;
      if (!logged) {
        state.isEmailVerified = false;
        state.currentUser = {};
        state.passwordLogin.loading = false;
        state.passwordLogin.error = null;
        state.passwordLogin.isEmailVerified = false;
      }
    },
    resetLoginErrors(state) {
      state.passwordLogin.error = null;
      state.googleSSOLogin.error = null;
    },
    setResentOtp(state, action) {
      state.verifyOtp.otpResent = action.payload;
    },
    resetForgotPasswordError(state) {
      state.forgotPassword.error = null;
    },
    resetvVerifyOTPError(state) {
      state.verifyOtp.error = null;
    },
    setRecoveryEmail(state, action) {
      state.recoveryEmail = action.payload;
    },
    resetForgotPasswordStates(state) {
      state.forgotPassword.userId = null;
      state.forgotPassword.otpSent = false;
      state.forgotPassword.loading = false;
      state.forgotPassword.error = null;
    },
    resetVerifyOtpStates(state) {
      state.verifyOtp.loading = false;
      state.verifyOtp.error = false;
      state.verifyOtp.otpResent = false;
      state.verifyOtp.userId = false;
    },
    resetResetPasswordStates(state) {
      state.resetPassword.loading = false;
      state.resetPassword.error = false;
      state.resetPassword.success = false;
      state.resetPassword.userId = false;
    },
    setCurrentUserRole(state, action) {
      Cookies.set("userRole", action.payload.toUpperCase(), {
        expires: 7,
        secure: true,
        sameSite: "Strict",
      });
      state.currentUserRole = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUserPass.pending, (state) => {
        state.passwordLogin.loading = true;
        state.passwordLogin.error = null;
        state.passwordLogin.isEmailVerified = false;
        state.passwordLogin.loginUserPassError = "";
      })
      .addCase(loginUserPass.fulfilled, (state, action) => {
        if (action.payload.sessionIdArray) {
          state.passwordLogin.error = "Please log out of the previous session before continuing";
        } else if (action.payload.id) {
          state.isLogin = false;
          state.passwordLogin.isEmailVerified = false;
          state.passwordLogin.loginUserPassError = "Please verify your email before continue";
        } else {
          const { accessToken, refreshToken } = action.payload;
          setCookies(accessToken, refreshToken);
          state.currentUser = decodeAccessToken(accessToken);
          state.isEmailVerified = true;
          state.isLogin = true;
        }
        state.passwordLogin.loading = false;
      })
      .addCase(loginUserPass.rejected, (state, action) => {
        state.passwordLogin.loading = false;
        state.passwordLogin.error = action.error?.message || ERR;
      })
      .addCase(sendforgotPasswordOtp.pending, (state) => {
        state.forgotPassword.loading = true;
        state.verifyOtp.otpResent = false;
        state.forgotPassword.error = null;
      })
      .addCase(sendforgotPasswordOtp.fulfilled, (state, action) => {
        if (state.forgotPassword.otpSent || state.forgotPassword.userId) state.verifyOtp.otpResent = true;
        state.forgotPassword.otpSent = true;
        state.forgotPassword.userId = action.payload.userId;
        state.verifyOtp.userId = action.payload.userId;
        state.resetPassword.userId = action.payload.userId;
        state.forgotPassword.loading = false;
      })
      .addCase(sendforgotPasswordOtp.rejected, (state, action) => {
        state.forgotPassword.loading = false;
        state.forgotPassword.error = action.error?.message || ERR;
      })
      .addCase(verifyforgotPasswordOtp.pending, (state) => {
        state.verifyOtp.loading = true;
        state.verifyOtp.error = null;
      })
      .addCase(verifyforgotPasswordOtp.fulfilled, (state) => {
        state.verifyOtp.otpVerified = true;
        state.verifyOtp.loading = false;
      })
      .addCase(verifyforgotPasswordOtp.rejected, (state, action) => {
        state.verifyOtp.loading = false;
        state.verifyOtp.error = action.error?.message || ERR;
      })
      .addCase(changeLoginPassword.pending, (state) => {
        state.resetPassword.loading = true;
        state.resetPassword.success = false;
        state.resetPassword.error = null;
      })
      .addCase(changeLoginPassword.fulfilled, (state) => {
        state.resetPassword.loading = false;
        state.resetPassword.success = true;
      })
      .addCase(changeLoginPassword.rejected, (state, action) => {
        state.resetPassword.loading = false;
        state.resetPassword.error = action.error?.message || ERR;
      })
      .addCase(registerUserSSO.pending, (state) => {
        state.googleSSOLogin.loading = true;
        state.googleSSOLogin.error = null;
      })
      .addCase(registerUserSSO.fulfilled, (state, action) => {
        if (action.payload.sessionIdArray) {
          state.googleSSOLogin.error = "Please log out of the previous session before continuing";
        } else if (action.payload.accessToken) {
          const { accessToken, refreshToken } = action.payload;
          setCookies(accessToken, refreshToken);
          state.currentUser = decodeAccessToken(accessToken);
          state.isEmailVerified = true;
          state.isLogin = true;
        }
        state.googleSSOLogin.loading = false;
      })
      .addCase(registerUserSSO.rejected, (state, action) => {
        state.googleSSOLogin.loading = false;
        state.googleSSOLogin.error = action.error?.message || ERR;
      })
      .addCase(getNewAuthToken.pending, (state) => {
        state.refreshTokenExpired = false;
      })
      .addCase(getNewAuthToken.fulfilled, (state) => {
        state.isLogin = true;
      })
      .addCase(getNewAuthToken.rejected, (state) => {
        state.isEmailVerified = false;
        state.currentUser = {};
        state.passwordLogin.isEmailVerified = false;
        state.refreshTokenExpired = true;
        state.isLogin = false;
      })
      .addCase(fetchProfile.pending, (state) => {
        state.passwordLogin.loading = true;
        state.passwordLogin.error = null;
        state.currentUser = {};
      })
      .addCase(fetchProfile.fulfilled, (state, action) => {
        state.currentUser = action.payload;
        state.passwordLogin.loading = false;
      })
      .addCase(fetchProfile.rejected, (state) => {
        state.passwordLogin.loading = false;
        state.passwordLogin.error = "Something went wrong while getting user details";
      });
  },
});

export const {
  resetLoginErrors,
  setUserLogin,
  setResentOtp,
  resetForgotPasswordError,
  resetvVerifyOTPError,
  setRecoveryEmail,
  resetVerifyOtpStates,
  resetForgotPasswordStates,
  resetResetPasswordStates,
  setCurrentUserRole,
} = authSlice.actions;

const authReducer = authSlice.reducer;

export default authReducer;
