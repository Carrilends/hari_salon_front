import { /* SubTag */ ChildTag, GenresI, Tag } from 'src/interfaces/tag';

export interface OptionsApiResponse {
  genders: GenresI[];
  childrens: ChildTag[];
  principalParents: Tag[];
}
