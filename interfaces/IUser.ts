export interface IUser {
  name?: string;
  formattedName?: string;
  framework: IFramework;
  createdOn?: number;
  updatedOn?: number;
}

export interface IFramework {
    board: string,
    medium: Array<string>,
    gradeLevel: Array<string>
}