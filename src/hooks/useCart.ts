import { useCallback, useReducer, useRef, useState } from "react";
import {
  cartReducer,
  readCart,
  CART_STORAGE_KEY,
  type CartAction,
} from "../utils/cart";
export function useCart() {
  const [items, dispatch] = useReducer(cartReducer, [], readCart);
  const current = useRef(items);
  const [storageError, setStorageError] = useState(false);
  const updateCart = useCallback((action: CartAction) => {
    const next = cartReducer(current.current, action);
    current.current = next;
    dispatch(action);
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(next));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }, []);
  return { items, updateCart, storageError };
}
