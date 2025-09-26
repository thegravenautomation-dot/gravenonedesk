import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, XCircle, Clock, RefreshCw } from "lucide-react";

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error';
  message: string;
  duration?: number;
}

export function AuthTestSuite() {
  const { user, profile, session, signIn, signOut, refreshProfile } = useAuth();
  const [results, setResults] = useState<TestResult[]>([]);
  const [running, setRunning] = useState(false);
  const [testCredentials, setTestCredentials] = useState({
    email: 'info@gravenautomation.com',
    password: ''
  });

  const addResult = (result: TestResult) => {
    setResults(prev => [...prev, result]);
  };

  const clearResults = () => {
    setResults([]);
  };

  const runTest = async (testName: string, testFn: () => Promise<void>) => {
    const startTime = Date.now();
    addResult({ name: testName, status: 'pending', message: 'Running...' });
    
    try {
      await testFn();
      const duration = Date.now() - startTime;
      setResults(prev => prev.map(r => 
        r.name === testName 
          ? { ...r, status: 'success', message: 'Passed', duration }
          : r
      ));
    } catch (error: any) {
      const duration = Date.now() - startTime;
      setResults(prev => prev.map(r => 
        r.name === testName 
          ? { ...r, status: 'error', message: error.message || 'Failed', duration }
          : r
      ));
    }
  };

  const testSignOut = async () => {
    if (!user) throw new Error('No user to sign out');
    
    await signOut();
    
    // Wait a bit for state to update
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (user) throw new Error('User still exists after sign out');
    if (profile) throw new Error('Profile still exists after sign out');
    if (session) throw new Error('Session still exists after sign out');
  };

  const testSignIn = async () => {
    if (!testCredentials.email || !testCredentials.password) {
      throw new Error('Please provide test credentials');
    }
    
    await signIn(testCredentials.email, testCredentials.password);
    
    // Wait a bit for state to update
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    if (!user) throw new Error('User not set after sign in');
    if (user.email !== testCredentials.email) {
      throw new Error(`Email mismatch: expected ${testCredentials.email}, got ${user.email}`);
    }
  };

  const testProfileFetch = async () => {
    if (!user) throw new Error('No user available for profile test');
    
    await refreshProfile();
    
    // Wait a bit for profile to load
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (!profile) throw new Error('Profile not loaded');
    if (profile.id !== user.id) {
      throw new Error(`Profile ID mismatch: expected ${user.id}, got ${profile.id}`);
    }
    if (profile.email !== user.email) {
      throw new Error(`Email mismatch: expected ${user.email}, got ${profile.email}`);
    }
  };

  const testSessionPersistence = async () => {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) throw error;
    if (!session && user) throw new Error('Session not persisted despite user being logged in');
    if (session && !user) throw new Error('Session exists but user not set in context');
  };

  const testProfileUpdate = async () => {
    if (!profile) throw new Error('No profile available for update test');
    
    const originalPhone = profile.phone;
    const testPhone = '+1234567890';
    
    const { error } = await supabase
      .from('profiles')
      .update({ phone: testPhone })
      .eq('id', profile.id);
    
    if (error) throw error;
    
    await refreshProfile();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (profile.phone !== testPhone) {
      throw new Error(`Phone not updated: expected ${testPhone}, got ${profile.phone}`);
    }
    
    // Restore original value
    await supabase
      .from('profiles')
      .update({ phone: originalPhone })
      .eq('id', profile.id);
    
    await refreshProfile();
  };

  const runAllTests = async () => {
    setRunning(true);
    clearResults();
    
    try {
      // Test 1: Session Persistence
      await runTest('Session Persistence', testSessionPersistence);
      
      // Test 2: Profile Fetch (if user exists)
      if (user) {
        await runTest('Profile Data Retrieval', testProfileFetch);
        await runTest('Profile Update', testProfileUpdate);
      }
      
      // Test 3: Sign Out (if user exists)
      if (user) {
        await runTest('Sign Out Functionality', testSignOut);
      }
      
      // Test 4: Sign In
      if (testCredentials.password) {
        await runTest('Sign In Functionality', testSignIn);
        
        // After sign in, test profile again
        await runTest('Profile After Sign In', testProfileFetch);
      }
      
    } finally {
      setRunning(false);
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'pending': return <Clock className="h-4 w-4 text-yellow-600 animate-pulse" />;
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'success': return 'bg-green-50 border-green-200';
      case 'error': return 'bg-red-50 border-red-200';
      case 'pending': return 'bg-yellow-50 border-yellow-200';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Authentication Test Suite</CardTitle>
          <CardDescription>
            Test suite for authentication endpoints and functionality
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current State */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>User Status</Label>
              <Badge variant={user ? 'default' : 'secondary'}>
                {user ? 'Authenticated' : 'Not Authenticated'}
              </Badge>
            </div>
            <div className="space-y-2">
              <Label>Profile Status</Label>
              <Badge variant={profile ? 'default' : 'secondary'}>
                {profile ? 'Loaded' : 'Not Loaded'}
              </Badge>
            </div>
            <div className="space-y-2">
              <Label>Session Status</Label>
              <Badge variant={session ? 'default' : 'secondary'}>
                {session ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </div>

          <Separator />

          {/* Test Configuration */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Test Configuration</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="test-email">Test Email</Label>
                <Input
                  id="test-email"
                  type="email"
                  value={testCredentials.email}
                  onChange={(e) => setTestCredentials(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Enter test email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="test-password">Test Password</Label>
                <Input
                  id="test-password"
                  type="password"
                  value={testCredentials.password}
                  onChange={(e) => setTestCredentials(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Enter test password"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Test Controls */}
          <div className="flex gap-2">
            <Button 
              onClick={runAllTests} 
              disabled={running}
              className="flex items-center gap-2"
            >
              {running ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : null}
              {running ? 'Running Tests...' : 'Run All Tests'}
            </Button>
            <Button variant="outline" onClick={clearResults}>
              Clear Results
            </Button>
          </div>

          {/* Current User Info */}
          {user && profile && (
            <Alert>
              <AlertDescription>
                <div className="space-y-1">
                  <p><strong>Current User:</strong> {user.email}</p>
                  <p><strong>Profile:</strong> {profile.full_name} ({profile.role})</p>
                  <p><strong>Last Sign In:</strong> {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'Unknown'}</p>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Test Results */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
            <CardDescription>
              {results.filter(r => r.status === 'success').length} passed, {' '}
              {results.filter(r => r.status === 'error').length} failed, {' '}
              {results.filter(r => r.status === 'pending').length} pending
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {results.map((result, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border ${getStatusColor(result.status)}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(result.status)}
                      <span className="font-medium">{result.name}</span>
                    </div>
                    {result.duration && (
                      <span className="text-sm text-muted-foreground">
                        {result.duration}ms
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {result.message}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}