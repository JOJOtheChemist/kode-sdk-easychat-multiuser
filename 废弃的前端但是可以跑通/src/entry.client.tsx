/* eslint-disable react/react-in-jsx-scope */
/**
 * By default, Remix will handle hydrating your app on the client for you.
 * You are free to delete this file if you'd like to, but if you ever want it revealed again, you can run `npx remix reveal` ✨
 * For more information, see https://remix.run/file-conventions/entry.client
 */

import React, { startTransition, StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import { MinimalApp } from "./minimal/app";
import "./tailwind.css";
import "./index.css";

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <MinimalApp />
    </StrictMode>,
  );
});
