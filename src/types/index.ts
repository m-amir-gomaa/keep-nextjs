export type NoteColor =
  | ""
  | "#faafa8"
  | "#f39f76"
  | "#fff8b8"
  | "#e2f6d3"
  | "#b4ddd3"
  | "#d4e4ed"
  | "#aeccdc"
  | "#d3bfdb"
  | "#f6e2dd"
  | "#e9e3d4"
  | "#efeff1";

export interface NoteLabel {
  labelId: string;
  label: {
    id: string;
    name: string;
  };
}

export interface Note {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  archived: boolean;
  deleted: boolean;
  color: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  userId: string;
  noteLabels: NoteLabel[];
}

export interface Label {
  id: string;
  name: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  userId: string;
}

export interface User {
  id: string;
  email: string;
  name?: string | null;
}
