import { /* SubTag */ GenresI, Tag } from 'src/interfaces/tag';

export interface OptionsApiResponse {
  genders: GenresI[];
  childrens: GenresI[];
  principalParents: Tag[];
}

export interface AuthResponse {
  id: string;
  email: string;
  fullName: string;
  roles: string[];
  isActive: boolean;
  token: string;
}
