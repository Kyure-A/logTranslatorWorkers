import untypedUserAgents from './user-agents.json';

const userAgents: UserAgentData[] = untypedUserAgents as UserAgentData[];

type NestedValueOf<T> = T extends object ? T[keyof T] | NestedValueOf<T[keyof T]> : T;

export type Filter<T extends UserAgentData | NestedValueOf<UserAgentData> = UserAgentData> =
  | ((parentObject: T) => boolean)
  | RegExp
  | Array<Filter<T>>
  | { [key: string]: Filter<T> }
  | string;

export interface UserAgentData {
  appName: 'Netscape';
  connection: {
    downlink: number;
    effectiveType: '3g' | '4g';
    rtt: number;
    downlinkMax?: number | null;
    type?: 'cellular' | 'wifi';
  };
  language?: string | null;
  oscpu?: string | null;
  platform:
    | 'iPad'
    | 'iPhone'
    | 'Linux aarch64'
    | 'Linux armv81'
    | 'Linux armv8l'
    | 'Linux x86_64'
    | 'MacIntel'
    | 'Win32';
  pluginsLength: number;
  screenHeight: number;
  screenWidth: number;
  userAgent: string;
  vendor: 'Apple Computer, Inc.' | 'Google Inc.' | '';
  weight: number;
}

// Normalize the total weight to 1 and construct a cumulative distribution.
const makeCumulativeWeightIndexPairs = (
  weightIndexPairs: Array<[number, number]>,
): Array<[number, number]> => {
  const totalWeight = weightIndexPairs.reduce((sum, [weight]) => sum + weight, 0);
  let sum = 0;
  return weightIndexPairs.map(([weight, index]) => {
    sum += weight / totalWeight;
    return [sum, index];
  });
};

const defaultWeightIndexPairs: Array<[number, number]> = userAgents.map(({ weight }, index) => [
  weight,
  index,
]);
const defaultCumulativeWeightIndexPairs = makeCumulativeWeightIndexPairs(defaultWeightIndexPairs);

const constructFilter = <T extends UserAgentData | NestedValueOf<UserAgentData>>(
  filters: Filter<T>,
  accessor: (parentObject: T) => T | NestedValueOf<T> = (parentObject: T): T => parentObject,
): ((profile: T) => boolean) => {
  let childFilters: Array<(parentObject: T) => boolean>;
  if (typeof filters === 'function') {
    childFilters = [filters];
  } else if (filters instanceof RegExp) {
    childFilters = [
      (value: T | NestedValueOf<T>) =>
        typeof value === 'object' && value && 'userAgent' in value && value.userAgent
          ? filters.test(value.userAgent)
          : filters.test(value as string),
    ];
  } else if (filters instanceof Array) {
    childFilters = filters.map((childFilter) => constructFilter(childFilter));
  } else if (typeof filters === 'object') {
    childFilters = Object.entries(filters).map(([key, valueFilter]) =>
      constructFilter(
        valueFilter as Filter<T>,
        (parentObject: T): T | NestedValueOf<T> =>
          (parentObject as unknown as { [key: string]: NestedValueOf<T> })[key] as NestedValueOf<T>,
      ),
    );
  } else {
    childFilters = [
      (value: T | NestedValueOf<T>) =>
        typeof value === 'object' && value && 'userAgent' in value && value.userAgent
          ? filters === value.userAgent
          : filters === value,
    ];
  }

  return (parentObject: T) => {
    try {
      const value = accessor(parentObject);
      return childFilters.every((childFilter) => childFilter(value as T));
    } catch (error) {
      return false;
    }
  };
};

const constructCumulativeWeightIndexPairsFromFilters = (
  filters?: Filter<UserAgentData>,
): Array<[number, number]> => {
  if (!filters) {
    return defaultCumulativeWeightIndexPairs;
  }

  const filter = constructFilter(filters);

  const weightIndexPairs: Array<[number, number]> = [];
  userAgents.forEach((rawUserAgent, index) => {
    if (filter(rawUserAgent)) {
      weightIndexPairs.push([rawUserAgent.weight, index]);
    }
  });
  return makeCumulativeWeightIndexPairs(weightIndexPairs);
};

export class UserAgent {
  private cumulativeWeightIndexPairs: Array<[number, number]> = [];
  public data: UserAgentData;

  constructor(filters?: Filter) {
    this.cumulativeWeightIndexPairs = constructCumulativeWeightIndexPairsFromFilters(filters);
    if (this.cumulativeWeightIndexPairs.length === 0) {
      throw new Error('No user agents matched your filters.');
    }
    this.randomize();
  }

  static random(filters?: Filter): UserAgent | null {
    try {
      return new UserAgent(filters);
    } catch (error) {
      return null;
    }
  }

  randomize(): void {
    const randomNumber = Math.random();
    const [, index] =
      this.cumulativeWeightIndexPairs.find(([cumulativeWeight]) => cumulativeWeight > randomNumber) ?? [];
    if (index == null) {
      throw new Error('Error finding a random user agent.');
    }
    const rawUserAgent = userAgents[index];
    this.data = JSON.parse(JSON.stringify(rawUserAgent));
  }

  toString(): string {
    return this.data.userAgent;
  }
}

export default UserAgent;
