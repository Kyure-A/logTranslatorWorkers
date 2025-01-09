import UserAgent from "../../user-agents/index.js";
import { LangCodeGoogle } from "./language";

export const Endpoint = {
  INFO: "info",
  TEXT: "text",
  AUDIO: "audio"
} as const;

type EndpointType = typeof Endpoint[keyof typeof Endpoint];

type Params = {
  [Endpoint.INFO]: {
    body: string
  },
  [Endpoint.TEXT]: {
    source: LangCodeGoogle<"source">,
    target: LangCodeGoogle<"target">,
    query: string
  },
  [Endpoint.AUDIO]: {
    lang: LangCodeGoogle<"target">,
    text: string,
    textLength: number,
    speed: number
  }
};

const request = <T extends EndpointType>(
  endpoint: T,
  retry: number = 0
) => ({
  with: (
    params: Params[T]
  ) => {
    const promise = retrieve(endpoint, params);
    console.log(promise);
		return {
      promise,
      doing: <V>(
        callback: (value: string) => V | undefined
      ): Promise<V | null> => (
        promise.then(callback)
               .catch(() => undefined)
               .then(result => isEmpty(result) && retry < 3 ? request(endpoint, retry + 1).with(params).doing(callback) : result ?? null))
		}
  }
});

const isEmpty = (item: any) => (
  !item || (typeof item === "object" && "length" in item && item.length <= 0)
);

const retrieve = async <T extends EndpointType>(endpoint: T, params: Params[T]) => {
  if (endpoint === Endpoint.TEXT) {
    const { source, target, query } = params as Params[typeof Endpoint.TEXT];
    const url = `https://translate.google.com/m?sl=${source}&tl=${target}&q=${query}`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": new UserAgent().toString()
      }
    });
		
		return response.ok ? response.text() : Promise.reject(response);
  }
	
  throw new Error("Invalid endpoint");
};

export default request;
