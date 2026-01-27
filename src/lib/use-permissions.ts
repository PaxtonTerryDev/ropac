import { get } from "./model-api-request";
import { View } from "./models"
import { useState, useEffect } from 'react'
interface PermissionsReturn<Data, Args, Action, Role> {
  data: Data,
  hasData: boolean,
}

interface UsePermissionsProps<Data, Args, Action, Role> {
  view: View<Data, Args, Action, Role>,
  args?: Args;
}

export default function usePermissions<Data, Args, Action, Role>({ view }: UsePermissionsProps<Data, Args, Action, Role>) {
  const [data, setData] = useState<Data | undefined>()
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const hasData = () => !(!data);

  async function request(args?: Args) {
    setIsLoading(true);

    const url = view.endpoints.get.url ?? view.endpoints.url;
    if (!url) {
      throw new Error("No URL defined in view endpoints");
    }

    await get(url, view.endpoints.headers);

    setIsLoading(false);
  }
}
