import { configureStore } from "@reduxjs/toolkit";
import interactionReducer from "./interactionSlice";
import chatReducer from "./chatSlice";

const store = configureStore({
  reducer: {
    interaction: interactionReducer,
    chat: chatReducer,
  },
});

export default store;
