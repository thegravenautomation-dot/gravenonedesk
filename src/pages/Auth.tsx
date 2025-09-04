import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Building2 } from "lucide-react";
import { Logo } from "@/components/Logo";
import { useEffect } from "react";

export default function Auth() {
  const navigate = useNavigate();
  const { signIn, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const [loginForm, setLoginForm] = useState({
    email: "",
    password: "",
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await signIn(loginForm.email, loginForm.password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <Logo className="mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground">Graven OneDesk</h1>
          <p className="text-muted-foreground">Business Management Platform</p>
        </div>

        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Welcome</CardTitle>
            <CardDescription className="text-center">
              Sign in to your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">Email</Label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="your.email@gravenonedesk.com"
                  value={loginForm.email}
                  onChange={(e) =>
                    setLoginForm({ ...loginForm, email: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password">Password</Label>
                <Input
                  id="login-password"
                  type="password"
                  value={loginForm.password}
                  onChange={(e) =>
                    setLoginForm({ ...loginForm, password: e.target.value })
                  }
                  required
                />
              </div>
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign In
              </Button>
            </form>
            
            <div className="mt-4 p-3 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground text-center">
                Account credentials are provided by HR department only.
                <br />
                Contact your HR for access.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="text-center text-sm text-muted-foreground">
          <Building2 className="inline-block w-4 h-4 mr-1" />
          Graven OneDesk - Business Management Platform
        </div>
      </div>
    </div>
  );
}