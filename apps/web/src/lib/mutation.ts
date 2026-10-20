import { useMutation, type UseMutationOptions, type UseMutationResult } from '@tanstack/react-query';

import { ApiError } from './api';
import { useToast } from '../components/ui/Toast';

interface Opts<TData, TVars> extends Omit<UseMutationOptions<TData, ApiError, TVars>, 'onSuccess' | 'onError'> {
  successMessage?: string;
  errorMessage?: string;
  onSuccess?: (data: TData, variables: TVars) => void | Promise<void>;
  onError?: (error: ApiError, variables: TVars) => void | Promise<void>;
}

/**
 * Thin wrapper around useMutation that pipes success / error to the toast
 * system by default. Callers can still pass their own onSuccess / onError.
 */
export function useApiMutation<TData, TVars = void>(
  mutationFn: (vars: TVars) => Promise<TData>,
  opts: Opts<TData, TVars> = {},
): UseMutationResult<TData, ApiError, TVars> {
  const toast = useToast();
  const { successMessage, errorMessage, onSuccess, onError, ...rest } = opts;
  return useMutation<TData, ApiError, TVars>({
    mutationFn,
    ...rest,
    onSuccess: async (data, vars, _ctx) => {
      if (successMessage) toast.success(successMessage);
      await onSuccess?.(data, vars);
    },
    onError: async (err, vars, _ctx) => {
      toast.error(errorMessage ?? err.message, err.code ? `Code: ${err.code}` : undefined);
      await onError?.(err, vars);
    },
  });
}
