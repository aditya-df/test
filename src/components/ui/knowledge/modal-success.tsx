import { Badge } from "../badge";
import { Button } from "../button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../dialog";
import { Data as DataOAuth2Connection } from "@/stores/oauth2-connection/model";

export default function ModalSuccess({
  openOAuthSuccessDialog,
  setOpenOAuthSuccessDialog,
  oauth2Connection,
  authRestAPI,
}: {
  openOAuthSuccessDialog: boolean;
  setOpenOAuthSuccessDialog: (open: boolean) => void;
  oauth2Connection: DataOAuth2Connection;
  authRestAPI: any;
}) {
  return (
    <div>
      {/* OAuth Success Dialog */}
      <Dialog
        open={openOAuthSuccessDialog}
        onOpenChange={setOpenOAuthSuccessDialog}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-green-600 dark:text-green-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              OAuth Connection Successful
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <p className="text-sm text-green-800 dark:text-green-200 mb-2">
                Your OAuth connection has been successfully configured and is
                now active.
              </p>
              {oauth2Connection && (
                <div className="space-y-4 text-xs">
                  {/* Authentication Data Fields - Primary Section */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm text-gray-800 dark:text-gray-200 border-b pb-1">
                      Authentication Data
                    </h4>

                    {/* Access Token */}
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground font-medium">
                        Access Token:
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 px-2 py-1 rounded border">
                          {oauth2Connection.accessToken
                            ? `${oauth2Connection.accessToken.substring(
                                0,
                                8
                              )}...${oauth2Connection.accessToken.slice(-4)}`
                            : "N/A"}
                        </span>
                        <Badge
                          variant="secondary"
                          className="h-4 text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                        >
                          Active
                        </Badge>
                      </div>
                    </div>

                    {/* Expiration Time */}
                    {oauth2Connection.accessExpiresAt && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground font-medium">
                          Expiration Time:
                        </span>
                        <span className="text-xs font-mono bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 px-2 py-1 rounded">
                          {new Date(
                            oauth2Connection.accessExpiresAt
                          ).toLocaleString()}
                        </span>
                      </div>
                    )}

                    {/* Access Token URL */}
                    {oauth2Connection.config?.accessTokenUrl && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground font-medium">
                          Access Token URL:
                        </span>
                        <span className="text-xs font-mono bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-2 py-1 rounded max-w-xs truncate">
                          {oauth2Connection.config.accessTokenUrl}
                        </span>
                      </div>
                    )}

                    {/* Client ID */}
                    {oauth2Connection.config?.clientId && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground font-medium">
                          Client ID:
                        </span>
                        <span className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                          {oauth2Connection.config.clientId.length > 20
                            ? `${oauth2Connection.config.clientId.substring(
                                0,
                                16
                              )}...`
                            : oauth2Connection.config.clientId}
                        </span>
                      </div>
                    )}

                    {/* Client Secret */}
                    {oauth2Connection.config?.clientSecret && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground font-medium">
                          Client Secret:
                        </span>
                        <span className="font-mono text-xs bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 px-2 py-1 rounded">
                          ••••••••••••
                          {oauth2Connection.config.clientSecret.slice(-4)}
                        </span>
                      </div>
                    )}

                    {/* Grant Type */}
                    {oauth2Connection.config?.grantType && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground font-medium">
                          Grant Type:
                        </span>
                        <Badge variant="outline" className="h-5 text-xs">
                          {oauth2Connection.config.grantType}
                        </Badge>
                      </div>
                    )}

                    {/* Username (if available from authRestAPI context) */}
                    {authRestAPI?.username && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground font-medium">
                          Username:
                        </span>
                        <span className="font-mono text-xs bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 px-2 py-1 rounded">
                          {authRestAPI.username}
                        </span>
                      </div>
                    )}

                    {/* Password (if available from authRestAPI context) */}
                    {authRestAPI?.password && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground font-medium">
                          Password:
                        </span>
                        <span className="font-mono text-xs bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 px-2 py-1 rounded">
                          ••••••••••••
                        </span>
                      </div>
                    )}

                    {/* Client Authentication Method */}
                    {oauth2Connection.config?.clientAuth && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground font-medium">
                          Client Authentication:
                        </span>
                        <Badge variant="secondary" className="h-5 text-xs">
                          {oauth2Connection.config.clientAuth}
                        </Badge>
                      </div>
                    )}

                    {/* Scope */}
                    {oauth2Connection.config?.scope && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground font-medium">
                          Scope:
                        </span>
                        <span className="text-xs bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 px-2 py-1 rounded">
                          {oauth2Connection.config.scope}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Connection Information */}
                  <div className="border-t pt-3 space-y-2">
                    <h4 className="font-medium text-gray-700 dark:text-gray-300">
                      Connection Details
                    </h4>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Connection ID:
                      </span>
                      <span className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                        {oauth2Connection.id}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Name:</span>
                      <span className="font-medium">
                        {oauth2Connection.name ||
                          oauth2Connection.config?.name ||
                          "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      <Badge
                        variant="secondary"
                        className="h-4 text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                      >
                        Connected
                      </Badge>
                    </div>
                    {oauth2Connection.externalId && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          External ID:
                        </span>
                        <span className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                          {oauth2Connection.externalId}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Timestamps */}
                  <div className="border-t pt-3 space-y-2">
                    <h4 className="font-medium text-gray-700 dark:text-gray-300">
                      Timestamps
                    </h4>
                    {oauth2Connection.createdAt && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Created:</span>
                        <span className="text-xs font-mono bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded">
                          {new Date(
                            oauth2Connection.createdAt
                          ).toLocaleString()}
                        </span>
                      </div>
                    )}
                    {oauth2Connection.updatedAt && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Updated:</span>
                        <span className="text-xs font-mono bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded">
                          {new Date(
                            oauth2Connection.updatedAt
                          ).toLocaleString()}
                        </span>
                      </div>
                    )}
                    {oauth2Connection.bindingCreatedAt && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Binding Created:
                        </span>
                        <span className="text-xs font-mono bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded">
                          {new Date(
                            oauth2Connection.bindingCreatedAt
                          ).toLocaleString()}
                        </span>
                      </div>
                    )}
                    {oauth2Connection.bindingExpiredAt && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Binding Expires:
                        </span>
                        <span className="text-xs font-mono bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded">
                          {new Date(
                            oauth2Connection.bindingExpiredAt
                          ).toLocaleString()}
                        </span>
                      </div>
                    )}
                    {oauth2Connection.refreshExpiresAt && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Refresh Expires:
                        </span>
                        <span className="text-xs font-mono bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded">
                          {new Date(
                            oauth2Connection.refreshExpiresAt
                          ).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setOpenOAuthSuccessDialog(false)}>
                Continue
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
