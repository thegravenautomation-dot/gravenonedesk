import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Building2 } from "lucide-react";
import { Logo } from "@/components/Logo";
import { useEffect } from "react";

export default function Auth() {
  const navigate = useNavigate();
  const { signIn, signUp, user } = useAuth();
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

  const [signupForm, setSignupForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    full_name: "",
    phone: "",
    role: "executive" as const,
    branch_id: "550e8400-e29b-41d4-a716-446655440001", // Default to Mumbai branch
    department: "",
    designation: "",
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

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (signupForm.password !== signupForm.confirmPassword) {
      setError("Passwords don't match");
      setLoading(false);
      return;
    }

    try {
      await signUp(signupForm.email, signupForm.password, {
        full_name: signupForm.full_name,
        role: signupForm.role,
        branch_id: signupForm.branch_id,
        phone: signupForm.phone,
        department: signupForm.department,
        designation: signupForm.designation,
      });
      setError("Check your email to confirm your account!");
    } catch (err: any) {
      setError(err.message || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <Logo className="mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground">Graven Automation</h1>
          <p className="text-muted-foreground">Business Management Platform</p>
        </div>

        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Welcome</CardTitle>
            <CardDescription className="text-center">
              Sign in to your account or create a new one
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="space-y-4">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="your.email@gravenautomation.com"
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
                    <Alert variant={error.includes("Check your email") ? "default" : "destructive"}>
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Sign In
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="space-y-4">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-name">Full Name</Label>
                      <Input
                        id="signup-name"
                        type="text"
                        placeholder="John Doe"
                        value={signupForm.full_name}
                        onChange={(e) =>
                          setSignupForm({ ...signupForm, full_name: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-phone">Phone</Label>
                      <Input
                        id="signup-phone"
                        type="tel"
                        placeholder="+91-9876543210"
                        value={signupForm.phone}
                        onChange={(e) =>
                          setSignupForm({ ...signupForm, phone: e.target.value })
                        }
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="your.email@gravenautomation.com"
                      value={signupForm.email}
                      onChange={(e) =>
                        setSignupForm({ ...signupForm, email: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-role">Role</Label>
                      <Select
                        value={signupForm.role}
                        onValueChange={(value: any) =>
                          setSignupForm({ ...signupForm, role: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="executive">Executive</SelectItem>
                          <SelectItem value="accountant">Accountant</SelectItem>
                          <SelectItem value="hr">HR</SelectItem>
                          <SelectItem value="procurement">Procurement</SelectItem>
                          <SelectItem value="dispatch">Dispatch</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-branch">Branch</Label>
                      <Select
                        value={signupForm.branch_id}
                        onValueChange={(value) =>
                          setSignupForm({ ...signupForm, branch_id: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="550e8400-e29b-41d4-a716-446655440001">Mumbai Head Office</SelectItem>
                          <SelectItem value="550e8400-e29b-41d4-a716-446655440002">Delhi Branch</SelectItem>
                          <SelectItem value="550e8400-e29b-41d4-a716-446655440003">Bangalore Branch</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-department">Department</Label>
                      <Input
                        id="signup-department"
                        type="text"
                        placeholder="Sales"
                        value={signupForm.department}
                        onChange={(e) =>
                          setSignupForm({ ...signupForm, department: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-designation">Designation</Label>
                      <Input
                        id="signup-designation"
                        type="text"
                        placeholder="Sales Executive"
                        value={signupForm.designation}
                        onChange={(e) =>
                          setSignupForm({ ...signupForm, designation: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      value={signupForm.password}
                      onChange={(e) =>
                        setSignupForm({ ...signupForm, password: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-confirm">Confirm Password</Label>
                    <Input
                      id="signup-confirm"
                      type="password"
                      value={signupForm.confirmPassword}
                      onChange={(e) =>
                        setSignupForm({ ...signupForm, confirmPassword: e.target.value })
                      }
                      required
                    />
                  </div>

                  {error && (
                    <Alert variant={error.includes("Check your email") ? "default" : "destructive"}>
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Account
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div className="text-center text-sm text-muted-foreground">
          <Building2 className="inline-block w-4 h-4 mr-1" />
          Graven Automation Pvt. Ltd. - Business Management Platform
        </div>
      </div>
    </div>
  );
}