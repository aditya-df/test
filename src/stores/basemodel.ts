export class State<T> {
  //singleton pattern
  private static _instance: State<unknown>;

  //attributes
  loading: boolean;
  success: boolean;
  error: boolean;
  errorData: Error | null;
  data: T[];
  selectedData: T;
  selectedAgent?: { name: string; id: string };
  offset: number;
  limit: number;
  count?: number;
  userId?: string;
  customData?: any;

  private constructor(
    loading: boolean = false,
    success: boolean = false,
    error: boolean = false,
    errorData: Error | null = null,
    data: T[] = [],
    selectedData: T | undefined = undefined,
    offset: number = 0,
    limit: number = 10,
    count: number = 0,
    userId?: string,
    customData?: any
  ) {
    this.loading = loading;
    this.success = success;
    this.error = error;
    this.errorData = errorData;
    this.data = data;
    this.selectedData = selectedData as T;
    this.offset = offset;
    this.limit = limit;
    this.count = count;
    this.userId = userId;
    this.customData = customData;
  }

  public static getInstance() {
    return (
      this._instance ||
      (this._instance = new this(
        false,
        false,
        false,
        null,
        [],
        null,
        0,
        10,
        0,
        "",
        null
      ))
    );
  }
}
