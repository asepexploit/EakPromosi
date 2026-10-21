import { useMutation, type UseMutationOptions, type UseMutationResult } from '@tanstack/react-query';

import type { ApiError } from './api';
import { usePlanLimit } from '../components/ui/PlanLimitProvider';
import { useToast } from '../components/ui/Toast';

interface Opts<TData, TVars> extends Omit<UseMutationOptions<TData, ApiError, TVars>, 'onSuccess' | 'onError'> {
  successMessage?: string;
  errorMessage?: string;
  onSuccess?: (data: TData, variables: TVars) => void | Promise<void>;
  onError?: (error: ApiError, variables: TVars) => void | Promise<void>;
}

/**
 * Thin wrapper around useMutation that:
 * - toasts success with `successMessage`.
 * - intercepts 402/PLAN_* errors into the plan-limit modal (not a toast).
 * - toasts anything else with `errorMessage`/the error's own message.
 */
export function useApiMutation<TData, TVars = void>(
  mutationFn: (vars: TVars) => Promise<TData>,
  opts: Opts<TData, TVars> = {},
): UseMutationResult<TData, ApiError, TVars> {
  const toast = useToast();
  const planLimit = usePlanLimit();
  const { successMessage, errorMessage, onSuccess, onError, ...rest } = opts;
  return useMutation<TData, ApiError, TVars>({
    mutationFn,
    ...rest,
    onSuccess: async (data, vars, _ctx) => {
      if (successMessage) toast.success(successMessage);
      await onSuccess?.(data, vars);
    },
    onError: async (err, vars, _ctx) => {
      const consumed = planLimit.handleError(err);
      if (!consumed) {
        toast.error(errorMessage ?? err.message, err.code ? `Code: ${err.code}` : undefined);
      }
      await onError?.(err, vars);
    },
  });
}
