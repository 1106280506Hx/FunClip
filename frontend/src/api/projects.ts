/**
 * Projects API - Project management endpoints
 */

import { api } from './client'

export interface Asset {
  id: number
  file_path: string
  original_filename: string
  asset_type: string
  duration: number | null
  width: number | null
  height: number | null
}

export interface ProjectData {
  id: string
  name: string
  description: string
  created_at: string
  updated_at: string
  thumbnail: string
  video_ids: string[]
  assets?: Asset[]
}

export interface ProjectListResponse {
  projects: ProjectData[]
  total: number
}

export interface CreateProjectRequest {
  name: string
  description?: string
}

export interface UpdateProjectRequest {
  name?: string
  description?: string
  thumbnail?: string
}

export const projectsApi = {
  /**
   * Get all projects with pagination
   */
  async list(skip = 0, limit = 20): Promise<ProjectListResponse> {
    return api.get<ProjectListResponse>(`/projects?skip=${skip}&limit=${limit}`)
  },

  /**
   * Get a specific project by ID
   */
  async get(projectId: string): Promise<ProjectData> {
    return api.get<ProjectData>(`/projects/${projectId}`)
  },

  /**
   * Create a new project
   */
  async create(data: CreateProjectRequest): Promise<ProjectData> {
    return api.post<ProjectData>('/projects', data)
  },

  /**
   * Update a project
   */
  async update(projectId: string, data: UpdateProjectRequest): Promise<ProjectData> {
    return api.put<ProjectData>(`/projects/${projectId}`, data)
  },

  /**
   * Delete a project
   */
  async delete(projectId: string): Promise<void> {
    return api.delete(`/projects/${projectId}`)
  },

  /**
   * Upload an asset to a project
   */
  async uploadAsset(projectId: string, file: File): Promise<Asset> {
    const formData = new FormData()
    formData.append('file', file)
    
    return api.upload<Asset>(`/projects/${projectId}/assets`, formData)
  },

  /**
   * Add a video to a project
   */
  async addVideo(projectId: string, videoId: string): Promise<void> {
    return api.post(`/projects/${projectId}/videos/${videoId}`)
  },

  /**
   * Remove a video from a project
   */
  async removeVideo(projectId: string, videoId: string): Promise<void> {
    return api.delete(`/projects/${projectId}/videos/${videoId}`)
  },
}
