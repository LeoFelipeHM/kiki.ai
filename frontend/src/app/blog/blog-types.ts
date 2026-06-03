export type BlogPostStatus = 'draft' | 'published';

export type BlogPost = {
  id: string;
  title: string;
  slug: string;
  summary: string;
  content: string;
  category: string;
  tags: string[];
  coverImage?: string;
  coverCardImage?: string;
  status: BlogPostStatus;
  author: string;
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type BlogPostInput = {
  title: string;
  slug?: string;
  summary: string;
  content: string;
  category: string;
  tags?: string[] | string;
  coverImage?: string;
  coverCardImage?: string;
  status: BlogPostStatus;
  author?: string;
  publishedAt?: string;
};
