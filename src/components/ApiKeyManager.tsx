import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Key, Eye, EyeOff, Save, RefreshCw, Shield, ExternalLink } from "lucide-react";

interface ApiKey {
  name: string;
  value: string;
  description: string;
  required: boolean;
  category: string;
}

export function ApiKeyManager() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showKeys, setShowKeys] = useState<{[key: string]: boolean}>({});
  const [apiKeys, setApiKeys] = useState<{[key: string]: string}>({});

  const keyDefinitions: ApiKey[] = [
    {
      name: "INDIAMART_API_KEY",
      value: "",
      description: "API key for IndiaMART lead synchronization",
      required: true,
      category: "Lead Sources"
    },
    {
      name: "TRADEINDIA_API_KEY", 
      value: "",
      description: "API key for TradeIndia lead synchronization",
      required: true,
      category: "Lead Sources"
    },
    {
      name: "WHATSAPP_ACCESS_TOKEN",
      value: "",
      description: "WhatsApp Business API access token for messaging",
      required: false,
      category: "Communication"
    },
    {
      name: "WHATSAPP_PHONE_NUMBER_ID",
      value: "",
      description: "WhatsApp Business phone number ID",
      required: false,
      category: "Communication"
    },
    {
      name: "RESEND_API_KEY",
      value: "",
      description: "Resend API key for email notifications",
      required: false,
      category: "Communication"
    },
    {
      name: "OPENAI_API_KEY",
      value: "",
      description: "OpenAI API key for AI-powered features",
      required: false,
      category: "AI Features"
    }
  ];

  useEffect(() => {
    // Initialize showKeys for all key definitions
    const initialShowKeys: {[key: string]: boolean} = {};
    keyDefinitions.forEach(keyDef => {
      initialShowKeys[keyDef.name] = false;
    });
    setShowKeys(initialShowKeys);
    
    fetchApiKeyStatus();
  }, []);

  const fetchApiKeyStatus = async () => {
    try {
      // Check which keys are already configured
      const { data, error } = await supabase.functions.invoke('check-api-keys');
      
      if (error) {
        console.error('Error checking API keys:', error);
        return;
      }

      if (data?.keys) {
        const keyStatus: {[key: string]: string} = {};
        data.keys.forEach((key: string) => {
          keyStatus[key] = '••••••••••••'; // Masked value to show it exists
        });
        setApiKeys(keyStatus);
      }
    } catch (error) {
      console.error('Error fetching API key status:', error);
    }
  };

  const handleSaveApiKey = async (keyName: string) => {
    const keyValue = apiKeys[keyName];
    if (!keyValue || keyValue === '••••••••••••') {
      toast({
        title: "Error",
        description: "Please enter a valid API key",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase.functions.invoke('update-api-key', {
        body: {
          keyName,
          keyValue
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `${keyName} updated successfully`,
      });

      // Mask the key after saving
      setApiKeys(prev => ({
        ...prev,
        [keyName]: '••••••••••••'
      }));
      
      setShowKeys(prev => ({
        ...prev,
        [keyName]: false
      }));

    } catch (error: any) {
      console.error('Error updating API key:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update API key",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (keyName: string, value: string) => {
    setApiKeys(prev => ({
      ...prev,
      [keyName]: value
    }));
  };

  const toggleKeyVisibility = (keyName: string) => {
    setShowKeys(prev => ({
      ...prev,
      [keyName]: !prev[keyName]
    }));
  };

  const testConnection = async (keyName: string) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke('test-api-connection', {
        body: { keyName }
      });

      if (error) throw error;

      let displayMessage = data?.success ? data.message : `Connection failed: ${data?.error || 'Unknown error'}`;
      
      // Provide user-friendly messages for common errors
      if (!data?.success && keyName === 'INDIAMART_API_KEY') {
        const errorMsg = data?.error || data?.message || '';
        if (errorMsg.includes('429') || errorMsg.toLowerCase().includes('rate limit') || errorMsg.toLowerCase().includes('too many requests')) {
          displayMessage = 'IndiaMART API rate limit reached. Please wait 5-10 minutes before testing again.';
        } else if (errorMsg.toLowerCase().includes('connection failed')) {
          displayMessage = 'Unable to connect to IndiaMART. Please check your API key and try again.';
        } else if (errorMsg.toLowerCase().includes('unauthorized') || errorMsg.includes('401')) {
          displayMessage = 'Invalid IndiaMART API key. Please check your credentials.';
        }
      }

      toast({
        title: "Connection Test",
        description: displayMessage,
        variant: data?.success ? "default" : "destructive",
      });

    } catch (error: any) {
      toast({
        title: "Test Failed",
        description: error.message || "Failed to test connection",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const manualSync = async () => {
    try {
      setLoading(true);
      
      // Get current user's branch ID
      const { data: userData } = await supabase.auth.getUser();
      const { data: profileData } = await supabase
        .from('profiles')
        .select('branch_id')
        .eq('id', userData.user?.id)
        .single();

      if (!profileData?.branch_id) {
        throw new Error('Branch ID not found');
      }

      const { data, error } = await supabase.functions.invoke('manual-indiamart-sync', {
        body: { branchId: profileData.branch_id }
      });

      if (error) throw error;

      toast({
        title: "IndiaMART Sync",
        description: data?.message || "Sync completed successfully",
        variant: data?.success ? "default" : "destructive",
      });

    } catch (error: any) {
      let errorMessage = error.message || "Failed to sync IndiaMART data";
      
      // Provide user-friendly messages for common IndiaMART errors
      if (errorMessage.toLowerCase().includes('rate limit') || errorMessage.includes('429')) {
        errorMessage = 'IndiaMART API rate limit exceeded. The system will automatically retry later. You can try manual sync again in 5-10 minutes.';
      } else if (errorMessage.toLowerCase().includes('unauthorized') || errorMessage.includes('401')) {
        errorMessage = 'IndiaMART API key is invalid. Please check your API key in settings.';
      } else if (errorMessage.toLowerCase().includes('connection')) {
        errorMessage = 'Unable to connect to IndiaMART. Please check your internet connection and try again.';
      }
      
      toast({
        title: "Sync Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const groupedKeys = keyDefinitions.reduce((acc, key) => {
    if (!acc[key.category]) {
      acc[key.category] = [];
    }
    acc[key.category].push(key);
    return acc;
  }, {} as {[category: string]: ApiKey[]});

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            API Key Management
          </CardTitle>
          <CardDescription>
            Configure API keys for third-party integrations. All keys are stored securely and encrypted.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {Object.entries(groupedKeys).map(([category, keys]) => (
            <div key={category} className="space-y-4">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold">{category}</h3>
                <Badge variant="outline" className="text-xs">
                  {keys.length} API{keys.length > 1 ? 's' : ''}
                </Badge>
              </div>
              
              <div className="grid gap-4">
                {keys.map((keyDef) => (
                  <Card key={keyDef.name} className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <Label htmlFor={keyDef.name} className="text-sm font-medium">
                            {keyDef.name}
                            {keyDef.required && (
                              <span className="text-red-500 ml-1">*</span>
                            )}
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            {keyDef.description}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {apiKeys[keyDef.name] && (
                            <Badge variant="outline" className="text-green-600 border-green-200">
                              <Shield className="h-3 w-3 mr-1" />
                              Configured
                            </Badge>
                          )}
                          {keyDef.required && !apiKeys[keyDef.name] && (
                            <Badge variant="destructive">
                              Required
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Input
                            id={keyDef.name}
                            type={showKeys[keyDef.name] ? "text" : "password"}
                            placeholder={`Enter ${keyDef.name}`}
                            value={apiKeys[keyDef.name] || ""}
                            onChange={(e) => handleInputChange(keyDef.name, e.target.value)}
                            className="pr-10"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => toggleKeyVisibility(keyDef.name)}
                          >
                            {showKeys[keyDef.name] ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        
                        <Button
                          onClick={() => handleSaveApiKey(keyDef.name)}
                          disabled={loading || !apiKeys[keyDef.name] || apiKeys[keyDef.name] === '••••••••••••'}
                          size="sm"
                        >
                          <Save className="h-4 w-4 mr-1" />
                          Save
                        </Button>
                        
                        {apiKeys[keyDef.name] && (
                          <Button
                            variant="outline"
                            onClick={() => testConnection(keyDef.name)}
                            disabled={loading}
                            size="sm"
                          >
                            <RefreshCw className="h-4 w-4 mr-1" />
                            Test
                          </Button>
                        )}
                        
                        {keyDef.name === 'INDIAMART_API_KEY' && apiKeys[keyDef.name] && (
                          <Button
                            variant="outline"
                            onClick={() => manualSync()}
                            disabled={loading}
                            size="sm"
                          >
                            Sync Now
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
              
              {category !== Object.keys(groupedKeys)[Object.keys(groupedKeys).length - 1] && (
                <Separator />
              )}
            </div>
          ))}
          
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-blue-900">Security Notice</h4>
                <p className="text-sm text-blue-700">
                  All API keys are encrypted and stored securely in Supabase Vault. They are never exposed in plain text in your application code.
                </p>
                <Button variant="outline" size="sm" className="text-blue-700 border-blue-200 hover:bg-blue-100">
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Learn More About Security
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}