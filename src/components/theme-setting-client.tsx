'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import { Palette, Plus, Pencil, Trash2, Eye, Upload, Loader2, Monitor, Shield, Lock } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useRouter } from "next/navigation";

interface ThemeColors {
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  background: string;
  layout: string;
  foreground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  border: string;
  input: string;
  ring: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  [key: string]: string;
}

interface Theme {
  id: string;
  name: string;
  description?: string;
  colors: ThemeColors;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  userId?: string;
}

export function ThemeSettingClient() {
  const router = useRouter();
  const [themes, setThemes] = useState<Theme[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingTheme, setEditingTheme] = useState<Theme | null>(null);
  const [viewingTheme, setViewingTheme] = useState<Theme | null>(null);
  const [previewingTheme, setPreviewingTheme] = useState<Theme | null>(null);
  const [deletingThemeId, setDeletingThemeId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculate custom theme count (non-default themes)
  const customThemeCount = themes.filter(theme => !theme.isDefault).length;
  const maxThemeLimit = 4;
  const canCreateTheme = customThemeCount < maxThemeLimit;
  const hasValidAccess = process.env.USING_CUSTOMIZE_THEME === 'true'
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    colors: {} as ThemeColors,
  });

  // Load themes
  const loadThemes = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/themes');
      if (!response.ok) throw new Error('Failed to fetch themes');
      const data = await response.json();
      setThemes(data);
    } catch (error) {
      console.error('Error loading themes:', error);
      toast({
        title: 'Error',
        description: 'Failed to load themes',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadThemes();
  }, []);

  useEffect(() => {
    if (!hasValidAccess && countdown === null && !isRedirecting) {
      setCountdown(5);
      setIsRedirecting(true);
    }
  }, [hasValidAccess, countdown, isRedirecting]);

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;

    if (!hasValidAccess && countdown !== null && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev === null || prev <= 1) {
            // Redirect when countdown reaches 0
            router.push("/dashboard");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    // Cleanup timer
    return () => {
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [hasValidAccess, countdown, router]);

  // Enhanced access control check
  if (!hasValidAccess) {
    return (
      <Card className="w-full mt-6 shadow-sm">
        <CardContent className="p-12">
          <div className="flex flex-col items-center justify-center text-center space-y-4">
            <div className="p-4 bg-red-100 dark:bg-red-900/20 rounded-full">
              <Shield className="w-12 h-12 text-red-600 dark:text-red-400" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Access Restricted
              </h2>
              <p className="text-gray-600 dark:text-gray-400 max-w-md">
                You don&apos;t have the necessary permissions to view Theme Setting.
                Please contact your administrator if you believe
                this is an error.
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <Lock className="w-4 h-4" />
              <span>Required permission: Read Access</span>
            </div>

            {/* IMPROVED: Better countdown display with loading state */}
            {countdown !== null && countdown >= 0 && (
              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 animate-in fade-in duration-300">
                <div className="flex items-center justify-center gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                    <p className="text-blue-800 dark:text-blue-200 font-medium">
                      Redirecting to dashboard in
                    </p>
                  </div>
                  <span className="inline-flex items-center justify-center w-10 h-10 bg-blue-600 text-white rounded-full font-bold text-xl transition-all duration-300 transform hover:scale-105">
                    {countdown}
                  </span>
                  <span className="text-blue-800 dark:text-blue-200 font-medium">
                    second{countdown !== 1 ? "s" : ""}...
                  </span>
                </div>
                {countdown === 0 && (
                  <div className="mt-2 text-center">
                    <div className="inline-flex items-center gap-2 text-blue-700 dark:text-blue-300">
                      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-sm">Redirecting...</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Manual redirect button as fallback */}
            <Button
              onClick={() => router.push("/dashboard")}
              variant="outline"
              className="mt-4"
            >
              Go to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }


  // Handle create/edit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const url = editingTheme ? `/api/themes/${editingTheme.id}` : '/api/themes';
      const method = editingTheme ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save theme');
      }

      toast({
        title: 'Success',
        description: `Theme ${editingTheme ? 'updated' : 'created'} successfully`,
      });

      setIsDialogOpen(false);
      resetForm();
      loadThemes();
    } catch (error) {
      console.error('Error saving theme:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save theme',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!deletingThemeId) return;

    try {
      const response = await fetch(`/api/themes/${deletingThemeId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete theme');
      }

      toast({
        title: 'Success',
        description: 'Theme deleted successfully',
      });

      setIsDeleteDialogOpen(false);
      setDeletingThemeId(null);
      loadThemes();
    } catch (error) {
      console.error('Error deleting theme:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete theme',
        variant: 'destructive',
      });
    }
  };

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const themeData = JSON.parse(content);

        if (!themeData.name || !themeData.colors) {
          throw new Error('Invalid theme format. Name and colors are required.');
        }

        setFormData({
          name: themeData.name,
          description: themeData.description || '',
          colors: themeData.colors,
        });

        toast({
          title: 'Success',
          description: 'Theme file loaded successfully',
        });
      } catch (error) {
        console.error('Error parsing theme file:', error);
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Failed to parse theme file',
          variant: 'destructive',
        });
      }
    };

    reader.readAsText(file);
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      colors: {} as ThemeColors,
    });
    setEditingTheme(null);
  };

  // Open edit dialog
  const handleEdit = (theme: Theme) => {
    setEditingTheme(theme);
    setFormData({
      name: theme.name,
      description: theme.description || '',
      colors: theme.colors,
    });
    setIsDialogOpen(true);
  };

  // Open view dialog
  const handleView = (theme: Theme) => {
    setViewingTheme(theme);
    setIsViewDialogOpen(true);
  };

  // Open preview dialog
  const handlePreview = (theme: Theme) => {
    setPreviewingTheme(theme);
    setIsPreviewDialogOpen(true);
  };

  // Open delete dialog
  const handleDeleteClick = (themeId: string) => {
    setDeletingThemeId(themeId);
    setIsDeleteDialogOpen(true);
  };

  // Open create dialog
  const handleCreate = () => {
    if (!canCreateTheme) {
      toast({
        title: 'Limit Reached',
        description: `You can only create up to ${maxThemeLimit} custom themes. Delete an existing theme to create a new one.`,
        variant: 'destructive',
      });
      return;
    }
    resetForm();
    setIsDialogOpen(true);
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Palette className="h-8 w-8" />
            Theme Settings
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage your custom themes for REST API integration
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Custom themes: {customThemeCount}/{maxThemeLimit}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Button
            onClick={handleCreate}
            className="flex items-center gap-2"
            disabled={!canCreateTheme}
          >
            <Plus className="h-4 w-4" />
            Create Theme
          </Button>
          {!canCreateTheme && (
            <p className="text-xs text-destructive">
              Maximum limit reached
            </p>
          )}
        </div>
      </div>

      {/* Loading state */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Theme Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {themes.map((theme) => (
              <Card key={theme.id} className="relative overflow-hidden">
                {theme.isDefault && (
                  <div className="absolute top-2 right-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
                    Default
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: theme.colors.primary }}
                    />
                    {theme.name}
                  </CardTitle>
                  {theme.description && (
                    <CardDescription>{theme.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-5 gap-2">
                    {Object.entries(theme.colors)
                      .slice(0, 10)
                      .map(([key, value]) => (
                        <div
                          key={key}
                          className="w-full h-8 rounded border"
                          style={{ backgroundColor: value }}
                          title={key}
                        />
                      ))}
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleView(theme)}
                      className="flex items-center gap-1"
                    >
                      <Eye className="h-3 w-3" />
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePreview(theme)}
                      className="flex items-center gap-1"
                    >
                      <Monitor className="h-3 w-3" />
                      Preview
                    </Button>
                  </div>
                  {!theme.isDefault && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(theme)}
                        className="flex items-center gap-1"
                      >
                        <Pencil className="h-3 w-3" />
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteClick(theme.id)}
                        className="flex items-center gap-1"
                      >
                        <Trash2 className="h-3 w-3" />
                        Delete
                      </Button>
                    </div>
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>

          {themes.length === 0 && (
            <div className="text-center py-12">
              <Palette className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No themes found</h3>
              <p className="text-muted-foreground mb-4">
                Create your first theme to get started
              </p>
              <Button onClick={handleCreate}>Create Theme</Button>
            </div>
          )}
        </>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTheme ? 'Edit Theme' : 'Create New Theme'}
            </DialogTitle>
            <DialogDescription>
              {editingTheme
                ? 'Update your theme configuration'
                : 'Create a new theme by uploading a JSON file or entering details manually'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* File Upload */}
            {!editingTheme && (
              <div className="space-y-2">
                <Label htmlFor="theme-upload">Upload Theme JSON</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="theme-upload"
                    type="file"
                    accept=".json"
                    onChange={handleFileUpload}
                    disabled={isSubmitting}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    disabled={isSubmitting}
                    title="Upload theme file"
                  >
                    <Upload className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Upload a JSON file with theme configuration
                </p>
              </div>
            )}

            {/* Theme Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Theme Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Enter theme name"
                required
                disabled={isSubmitting}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Enter theme description"
                disabled={isSubmitting}
              />
            </div>

            {/* Colors JSON */}
            <div className="space-y-2">
              <Label htmlFor="colors">Colors (JSON) *</Label>
              <Textarea
                id="colors"
                value={JSON.stringify(formData.colors, null, 2)}
                onChange={(e) => {
                  try {
                    const colors = JSON.parse(e.target.value);
                    setFormData({ ...formData, colors });
                  } catch {
                    // Invalid JSON, don't update
                  }
                }}
                placeholder='{"primary": "#000000", ...}'
                rows={10}
                className="font-mono text-xs"
                required
                disabled={isSubmitting}
              />
              <p className="text-xs text-muted-foreground">
                Enter theme colors in JSON format
              </p>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsDialogOpen(false);
                  resetForm();
                }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : editingTheme ? (
                  'Update Theme'
                ) : (
                  'Create Theme'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded-full"
                style={{
                  backgroundColor: viewingTheme?.colors.primary || '#000',
                }}
              />
              {viewingTheme?.name}
            </DialogTitle>
            <DialogDescription>
              {viewingTheme?.description || 'No description'}
            </DialogDescription>
          </DialogHeader>

          {viewingTheme && (
            <div className="space-y-4">
              {/* Color Grid */}
              <div>
                <h3 className="font-semibold mb-3">Colors</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {Object.entries(viewingTheme.colors).map(([key, value]) => (
                    <div
                      key={key}
                      className="flex items-center gap-2 p-2 rounded border"
                    >
                      <div
                        className="w-8 h-8 rounded border flex-shrink-0"
                        style={{ backgroundColor: value }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{key}</p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {value}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* JSON Export */}
              <div>
                <h3 className="font-semibold mb-2">JSON Configuration</h3>
                <pre className="bg-muted p-4 rounded text-xs overflow-auto max-h-64">
                  {JSON.stringify(
                    {
                      name: viewingTheme.name,
                      description: viewingTheme.description,
                      colors: viewingTheme.colors,
                    },
                    null,
                    2
                  )}
                </pre>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsViewDialogOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              theme from the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setDeletingThemeId(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Preview Dialog */}
      <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5" />
              Theme Preview - {previewingTheme?.name}
            </DialogTitle>
            <DialogDescription>
              Preview how the theme will look on different pages
            </DialogDescription>
          </DialogHeader>

          {previewingTheme && (
            <style>
              {`
                .preview-theme-container {
                  --preview-primary: ${previewingTheme.colors.primary};
                  --preview-primary-foreground: ${previewingTheme.colors.primaryForeground};
                  --preview-secondary: ${previewingTheme.colors.secondary};
                  --preview-secondary-foreground: ${previewingTheme.colors.secondaryForeground};
                  --preview-background: ${previewingTheme.colors.background};
                  --preview-layout: ${previewingTheme.colors.layout};
                  --preview-foreground: ${previewingTheme.colors.foreground};
                  --preview-muted: ${previewingTheme.colors.muted};
                  --preview-muted-foreground: ${previewingTheme.colors.mutedForeground};
                  --preview-accent: ${previewingTheme.colors.accent};
                  --preview-accent-foreground: ${previewingTheme.colors.accentForeground};
                  --preview-border: ${previewingTheme.colors.border};
                  --preview-input: ${previewingTheme.colors.input};
                  --preview-card: ${previewingTheme.colors.card};
                  --preview-card-foreground: ${previewingTheme.colors.cardForeground};
                }
                .preview-theme-container {
                  background-color: var(--preview-layout);
                  color: var(--preview-foreground);
                }
                .preview-card {
                  background-color: var(--preview-card);
                  border-color: var(--preview-border);
                  color: var(--preview-card-foreground);
                }
                .preview-btn-primary {
                  background-color: var(--preview-primary);
                  color: var(--preview-primary-foreground);
                }
                .preview-btn-outline {
                  border-color: var(--preview-border);
                  background-color: transparent;
                  color: var(--preview-foreground);
                }
                .preview-btn-outline:hover {
                  background-color: var(--preview-accent);
                  color: var(--preview-accent-foreground);
                }
                .preview-input {
                  border-color: var(--preview-border);
                  background-color: var(--preview-background);
                  color: var(--preview-foreground);
                }
                .preview-muted-text {
                  color: var(--preview-muted-foreground);
                }
              `}
            </style>
          )}

          <Tabs defaultValue="dashboard" className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
              <TabsTrigger value="agent">Agent</TabsTrigger>
              <TabsTrigger value="knowledge">Knowledge</TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard" className="flex-1 mt-4 overflow-auto">
              <div className="preview-theme-container w-full min-h-[600px] p-6 rounded-lg border">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold mb-2">Dashboard</h2>
                  <p className="preview-muted-text">Overview of your workspace</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="preview-card rounded-lg border p-6">
                    <h3 className="font-semibold mb-2">Total Agents</h3>
                    <p className="text-3xl font-bold" style={{ color: previewingTheme?.colors.primary }}>12</p>
                    <p className="preview-muted-text text-sm mt-2">+2 from last month</p>
                  </div>

                  <div className="preview-card rounded-lg border p-6">
                    <h3 className="font-semibold mb-2">Active Chats</h3>
                    <p className="text-3xl font-bold" style={{ color: previewingTheme?.colors.primary }}>48</p>
                    <p className="preview-muted-text text-sm mt-2">+12 from last week</p>
                  </div>

                  <div className="preview-card rounded-lg border p-6">
                    <h3 className="font-semibold mb-2">Knowledge Base</h3>
                    <p className="text-3xl font-bold" style={{ color: previewingTheme?.colors.primary }}>156</p>
                    <p className="preview-muted-text text-sm mt-2">Documents indexed</p>
                  </div>
                </div>

                <div className="preview-card rounded-lg border p-6">
                  <h3 className="font-semibold mb-4">Recent Activity</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-2 border-b" style={{ borderColor: previewingTheme?.colors.border }}>
                      <span>New agent created</span>
                      <span className="preview-muted-text text-sm">2 hours ago</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b" style={{ borderColor: previewingTheme?.colors.border }}>
                      <span>Chat session completed</span>
                      <span className="preview-muted-text text-sm">5 hours ago</span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span>Knowledge base updated</span>
                      <span className="preview-muted-text text-sm">1 day ago</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button className="preview-btn-primary px-4 py-2 rounded-md font-medium">
                    Primary Action
                  </button>
                  <button className="preview-btn-outline px-4 py-2 rounded-md font-medium border">
                    Secondary Action
                  </button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="agent" className="flex-1 mt-4 overflow-auto">
              <div className="preview-theme-container w-full min-h-[600px] p-6 rounded-lg border">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold mb-2">Agents</h2>
                  <p className="preview-muted-text">Manage your AI agents</p>
                </div>

                <div className="mb-4 flex gap-3">
                  <input
                    type="text"
                    placeholder="Search agents..."
                    className="preview-input flex-1 px-4 py-2 rounded-md border"
                  />
                  <button className="preview-btn-primary px-6 py-2 rounded-md font-medium">
                    Create Agent
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="preview-card rounded-lg border p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-lg mb-1">Customer Support Agent</h3>
                        <p className="preview-muted-text text-sm">Handles customer inquiries</p>
                      </div>
                      <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: previewingTheme?.colors.primary }}>
                        <span className="text-white font-bold">CS</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button className="preview-btn-outline px-3 py-1.5 rounded-md text-sm border">
                        Edit
                      </button>
                      <button className="preview-btn-outline px-3 py-1.5 rounded-md text-sm border">
                        View Details
                      </button>
                    </div>
                  </div>

                  <div className="preview-card rounded-lg border p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-lg mb-1">Sales Assistant</h3>
                        <p className="preview-muted-text text-sm">Assists with sales queries</p>
                      </div>
                      <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: previewingTheme?.colors.primary }}>
                        <span className="text-white font-bold">SA</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button className="preview-btn-outline px-3 py-1.5 rounded-md text-sm border">
                        Edit
                      </button>
                      <button className="preview-btn-outline px-3 py-1.5 rounded-md text-sm border">
                        View Details
                      </button>
                    </div>
                  </div>

                  <div className="preview-card rounded-lg border p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-lg mb-1">Technical Support</h3>
                        <p className="preview-muted-text text-sm">Provides technical assistance</p>
                      </div>
                      <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: previewingTheme?.colors.primary }}>
                        <span className="text-white font-bold">TS</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button className="preview-btn-outline px-3 py-1.5 rounded-md text-sm border">
                        Edit
                      </button>
                      <button className="preview-btn-outline px-3 py-1.5 rounded-md text-sm border">
                        View Details
                      </button>
                    </div>
                  </div>

                  <div className="preview-card rounded-lg border p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-lg mb-1">HR Assistant</h3>
                        <p className="preview-muted-text text-sm">Handles HR-related questions</p>
                      </div>
                      <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: previewingTheme?.colors.primary }}>
                        <span className="text-white font-bold">HR</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button className="preview-btn-outline px-3 py-1.5 rounded-md text-sm border">
                        Edit
                      </button>
                      <button className="preview-btn-outline px-3 py-1.5 rounded-md text-sm border">
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="knowledge" className="flex-1 mt-4 overflow-auto">
              <div className="preview-theme-container w-full min-h-[600px] p-6 rounded-lg border">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold mb-2">Knowledge Base</h2>
                  <p className="preview-muted-text">Manage your documents and knowledge</p>
                </div>

                <div className="mb-4 flex gap-3">
                  <input
                    type="text"
                    placeholder="Search knowledge base..."
                    className="preview-input flex-1 px-4 py-2 rounded-md border"
                  />
                  <button className="preview-btn-primary px-6 py-2 rounded-md font-medium">
                    Upload Document
                  </button>
                </div>

                <div className="preview-card rounded-lg border overflow-hidden">
                  <table className="w-full">
                    <thead style={{ backgroundColor: previewingTheme?.colors.muted }}>
                      <tr>
                        <th className="px-6 py-3 text-left text-sm font-semibold">Document Name</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold">Type</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold">Size</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold">Updated</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t" style={{ borderColor: previewingTheme?.colors.border }}>
                        <td className="px-6 py-4">Product Documentation.pdf</td>
                        <td className="px-6 py-4 preview-muted-text">PDF</td>
                        <td className="px-6 py-4 preview-muted-text">2.5 MB</td>
                        <td className="px-6 py-4 preview-muted-text">2 days ago</td>
                        <td className="px-6 py-4">
                          <button className="preview-btn-outline px-3 py-1 rounded text-sm border">
                            View
                          </button>
                        </td>
                      </tr>
                      <tr className="border-t" style={{ borderColor: previewingTheme?.colors.border }}>
                        <td className="px-6 py-4">API Reference Guide.md</td>
                        <td className="px-6 py-4 preview-muted-text">Markdown</td>
                        <td className="px-6 py-4 preview-muted-text">156 KB</td>
                        <td className="px-6 py-4 preview-muted-text">5 days ago</td>
                        <td className="px-6 py-4">
                          <button className="preview-btn-outline px-3 py-1 rounded text-sm border">
                            View
                          </button>
                        </td>
                      </tr>
                      <tr className="border-t" style={{ borderColor: previewingTheme?.colors.border }}>
                        <td className="px-6 py-4">User Manual.docx</td>
                        <td className="px-6 py-4 preview-muted-text">DOCX</td>
                        <td className="px-6 py-4 preview-muted-text">1.8 MB</td>
                        <td className="px-6 py-4 preview-muted-text">1 week ago</td>
                        <td className="px-6 py-4">
                          <button className="preview-btn-outline px-3 py-1 rounded text-sm border">
                            View
                          </button>
                        </td>
                      </tr>
                      <tr className="border-t" style={{ borderColor: previewingTheme?.colors.border }}>
                        <td className="px-6 py-4">FAQ Document.txt</td>
                        <td className="px-6 py-4 preview-muted-text">TXT</td>
                        <td className="px-6 py-4 preview-muted-text">45 KB</td>
                        <td className="px-6 py-4 preview-muted-text">2 weeks ago</td>
                        <td className="px-6 py-4">
                          <button className="preview-btn-outline px-3 py-1 rounded text-sm border">
                            View
                          </button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="preview-card rounded-lg border p-6 mt-6">
                  <h3 className="font-semibold mb-3">Storage Information</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="preview-muted-text">Total Documents</span>
                      <span className="font-semibold">156 files</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="preview-muted-text">Total Size</span>
                      <span className="font-semibold">245 MB</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="preview-muted-text">Storage Used</span>
                      <span className="font-semibold">24.5%</span>
                    </div>
                  </div>
                  <div className="mt-4 w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: previewingTheme?.colors.muted }}>
                    <div className="h-full rounded-full" style={{ backgroundColor: previewingTheme?.colors.primary, width: '24.5%' }}></div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsPreviewDialogOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
