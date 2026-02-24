export class Data {
  constructor(
    public id: number,
    public adminId: number,
    public name: string,
    public color: string,
    public background_color: string,
    public isEnabled: boolean,
    public createdAt: Date | null,
    public updatedAt: Date | null,
    public deletedAt: Date | null
  ) {}
}
