import { get } from "./model-api-request";
import { ModelResponse, View } from "./models"
import { useState, useEffect } from 'react'

interface PermissionsReturn<Data, Action> {
  data: ModelResponse<Data, Action> | undefined;
  isLoading: boolean;
}

interface UsePermissionsProps<Data, Args, Action, Role> {
  view: View<Data, Args, Action, Role>;
  args?: Args;
}

export default function usePermissions<Data, Args, Action, Role>({ view, args }: UsePermissionsProps<Data, Args, Action, Role>): PermissionsReturn<Data, Action> {
  const [data, setData] = useState<ModelResponse<Data, Action> | undefined>()
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    (async () => {
      const result = await request(args);
      setData(result);
    })();
  }, [args])

  async function request(args?: Args) {
    setIsLoading(true);

    const baseUrl = view.endpoints.get.url ?? view.endpoints.url;
    if (!baseUrl) {
      throw new Error("No URL defined in view endpoints");
    }

    const params = new URLSearchParams();
    if (args) {
      for (const [key, value] of Object.entries(args)) {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      }
    }

    const queryString = params.toString();
    const url = queryString ? `${baseUrl}?${queryString}` : baseUrl;

    const result = await get<Data, Action>(url, view.endpoints.headers);

    setIsLoading(false);

    return result
  }


  return { data, isLoading };
}
