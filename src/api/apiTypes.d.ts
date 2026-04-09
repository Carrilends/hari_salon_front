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

export interface CreateReviewBody {
  name: string;
  description: string;
  score: number;
}

export interface CreateReviewResponse extends CreateReviewBody {
  id: string;
  createdAt: string;
  userId: string;
}

export interface ReviewItem {
  id: string;
  name: string;
  description: string;
  score: number;
  createdAt: string;
}
