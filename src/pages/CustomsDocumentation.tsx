import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, FileText, Send } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';

interface CustomsDocument {
  id: string;
  id_dokumen: string;
  document_type: string;
  document_number: string;
  status: string;
  payload?: any;
  ceisa_response?: any;
  created_at: string;
}

export default function CustomsDocumentation() {
  const [documents, setDocuments] = useState<CustomsDocument[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sendingDoc, setSendingDoc] = useState<string | null>(null);
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    document_type: 'BC2.3',
    document_number: '',
    consignee_name: '',
    consignee_npwp: '',
    goods_description: ''
  });

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    const { data, error } = await supabase
      .from('customs_docs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch documents',
        variant: 'destructive'
      });
    } else {
      setDocuments(data || []);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const id_dokumen = `${formData.document_type}-${Date.now()}`;
    const payload = {
      document_type: formData.document_type,
      document_number: formData.document_number,
      consignee: {
        name: formData.consignee_name,
        npwp: formData.consignee_npwp
      },
      goods: {
        description: formData.goods_description
      },
      timestamp: new Date().toISOString()
    };

    const { error } = await supabase.from('customs_docs').insert({
      id_dokumen,
      document_type: formData.document_type,
      document_number: formData.document_number,
      payload,
      status: 'draft'
    });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to create document',
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Success',
        description: 'Document created successfully'
      });
      setIsDialogOpen(false);
      setFormData({
        document_type: 'BC2.3',
        document_number: '',
        consignee_name: '',
        consignee_npwp: '',
        goods_description: ''
      });
      fetchDocuments();
    }

    setLoading(false);
  };

  const sendToCeisa = async (doc: CustomsDocument) => {
    setSendingDoc(doc.id);

    try {
      const { data, error } = await supabase.functions.invoke('supabase-functions-ceisa_adapter', {
        body: {
          id_dokumen: doc.id_dokumen,
          payload: doc.payload
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: 'Success',
          description: 'Document sent to CEISA successfully'
        });
        fetchDocuments();
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to send document to CEISA',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send document to CEISA',
        variant: 'destructive'
      });
    }

    setSendingDoc(null);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { 
        label: 'DRAFT', 
        className: 'bg-gray-100 text-gray-700 border-gray-300 font-semibold'
      },
      sent: { 
        label: 'SENT', 
        className: 'bg-blue-100 text-blue-700 border-blue-400 font-semibold'
      },
      accepted: { 
        label: 'ACCEPTED', 
        className: 'bg-green-100 text-green-700 border-green-400 font-semibold'
      },
      rejected: { 
        label: 'REJECTED', 
        className: 'bg-red-100 text-red-700 border-red-400 font-semibold'
      },
      failed: { 
        label: 'FAILED', 
        className: 'bg-red-100 text-red-700 border-red-400 font-semibold'
      }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    return <Badge className={config.className} variant="outline">{config.label}</Badge>;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link to="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">Customs Documentation</h1>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Document
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Customs Document</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="document_type">Document Type</Label>
                  <Select value={formData.document_type} onValueChange={(v) => setFormData({ ...formData, document_type: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BC2.3">BC2.3</SelectItem>
                      <SelectItem value="BC4.0">BC4.0</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="document_number">Document Number</Label>
                  <Input
                    id="document_number"
                    value={formData.document_number}
                    onChange={(e) => setFormData({ ...formData, document_number: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="consignee_name">Consignee Name</Label>
                  <Input
                    id="consignee_name"
                    value={formData.consignee_name}
                    onChange={(e) => setFormData({ ...formData, consignee_name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="consignee_npwp">Consignee NPWP</Label>
                  <Input
                    id="consignee_npwp"
                    value={formData.consignee_npwp}
                    onChange={(e) => setFormData({ ...formData, consignee_npwp: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="goods_description">Goods Description</Label>
                  <Input
                    id="goods_description"
                    value={formData.goods_description}
                    onChange={(e) => setFormData({ ...formData, goods_description: e.target.value })}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Document'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <Card>
            <CardHeader>
              <CardTitle>Document List</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Document Number</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <div className="flex items-center">
                          <FileText className="h-4 w-4 mr-2" />
                          {doc.document_type}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{doc.document_number}</TableCell>
                      <TableCell>{new Date(doc.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        {getStatusBadge(doc.status)}
                      </TableCell>
                      <TableCell>
                        {doc.status === 'draft' && (
                          <Button
                            size="sm"
                            onClick={() => sendToCeisa(doc)}
                            disabled={sendingDoc === doc.id}
                          >
                            <Send className="h-4 w-4 mr-2" />
                            {sendingDoc === doc.id ? 'Sending...' : 'Send to CEISA'}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}