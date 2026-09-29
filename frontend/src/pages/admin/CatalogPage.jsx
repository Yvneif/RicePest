import { useRef, useState } from "react";
import { Plus, Trash2, Pencil, ImagePlus, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "../../components/ui/Button";
import { Card, Chip, Skeleton } from "../../components/ui/Primitives";
import { AdminLayout } from "./Shared";
import { useAuth } from "../../context/AuthContext";
import { useApi } from "../../hooks/useApi";
import { api } from "../../api/client";

const EMPTY_FORM = {
  title: "",
  scientificName: "",
  description: "",
  damageSigns: "",
  status: "available",
};

export function AdminCatalogPage() {
  const { user } = useAuth();
  const { data, loading, error, refetch } = useApi(user ? "/api/admin/catalog" : null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null); // item being edited
  const [form, setForm] = useState(EMPTY_FORM);
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setImage(null);
    setImagePreview(null);
    setShowForm(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({
      title: item.title ?? "",
      scientificName: item.scientificName ?? "",
      description: item.description ?? "",
      damageSigns: item.damageSigns ?? "",
      status: item.status ?? "available",
    });
    setImage(null);
    setImagePreview(item.imageUrl);
    setShowForm(true);
  };

  const pickImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImage(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error("Title is required.");
      return;
    }
    setBusy(true);
    try {
      const payload = new FormData();
      Object.entries(form).forEach(([k, v]) => payload.append(k, v));
      if (image) payload.append("image", image);
      if (editing) {
        await api.post(`/api/admin/catalog/${editing.uid}`, payload);
        toast.success("Catalog item updated.");
      } else {
        await api.post("/api/admin/catalog", payload);
        toast.success("Catalog item created.");
      }
      setShowForm(false);
      refetch();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (item) => {
    if (!window.confirm(`Delete "${item.title}" from the catalog?`)) return;
    try {
      await api.post(`/api/admin/catalog/${item.uid}/delete`, {});
      toast.success("Deleted.");
      refetch();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const items = data?.items ?? [];

  return (
    <AdminLayout title="Catalog manager">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-stone-500">{items.length} items</p>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4" /> Add item
        </Button>
      </div>

      {loading && <Skeleton className="h-40" />}
      {error && <p className="text-sm text-red-500">{error.message}</p>}

      <div className="grid gap-3">
        {items.map((item) => (
          <Card key={item.uid} className="flex items-center gap-4 p-3">
            {item.imageUrl ? (
              <img
                src={item.imageUrl}
                alt=""
                className="h-16 w-16 shrink-0 rounded-2xl object-cover"
              />
            ) : (
              <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-stone-200">
                <ImagePlus className="h-5 w-5 text-stone-400" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{item.title}</p>
              <p className="truncate text-xs text-stone-400">
                {item.description || "No description"}
              </p>
              <Chip tone={item.status === "available" ? "brand" : "neutral"} className="mt-1">
                {item.status}
              </Chip>
            </div>
            <div className="flex shrink-0 flex-col gap-1.5">
              <button
                onClick={() => openEdit(item)}
                className="btn-press rounded-xl p-2 text-stone-400 hover:bg-stone-200/60"
                aria-label="Edit"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                onClick={() => remove(item)}
                className="btn-press rounded-xl p-2 text-red-400 hover:bg-red-50"
                aria-label="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </Card>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 backdrop-blur-sm sm:items-center">
          <Card className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-b-none p-6 sm:rounded-[2rem]">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-bold">
                {editing ? "Edit catalog item" : "New catalog item"}
              </h3>
              <button
                onClick={() => setShowForm(false)}
                aria-label="Close"
                className="rounded-lg p-1.5 hover:bg-stone-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={submit} className="mt-4 space-y-3">
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="btn-press relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-stone-200 dark:bg-white/10"
                >
                  {imagePreview ? (
                    <img src={imagePreview} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <ImagePlus className="mx-auto h-6 w-6 text-stone-400" />
                  )}
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  onChange={pickImage}
                  className="hidden"
                />
                <p className="text-xs text-stone-400">
                  {editing ? "Replace the photo (optional)." : "JPG, PNG or WebP — up to 8 MB."}
                </p>
              </div>
              {[
                ["title", "Title", "text"],
                ["scientificName", "Scientific name (optional)", "text"],
                ["description", "Description", "textarea"],
                ["damageSigns", "Damage signs (optional)", "textarea"],
              ].map(([key, label, type]) => (
                <label key={key} className="block">
                  <span className="mb-1 block text-xs font-semibold text-stone-500">{label}</span>
                  {type === "textarea" ? (
                    <textarea
                      rows={3}
                      value={form[key]}
                      onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                      className="w-full rounded-xl border border-stone-200 bg-transparent px-3.5 py-2.5 text-sm outline-none focus:border-brand-600"
                    />
                  ) : (
                    <input
                      type={type}
                      value={form[key]}
                      onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                      className="w-full rounded-xl border border-stone-200 bg-transparent px-3.5 py-2.5 text-sm outline-none focus:border-brand-600"
                    />
                  )}
                </label>
              ))}
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-stone-500">Status</span>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full rounded-xl border border-stone-200 bg-transparent px-3.5 py-2.5 text-sm outline-none focus:border-brand-600"
                >
                  <option value="available">available</option>
                  <option value="unavailable">unavailable</option>
                </select>
              </label>
              <Button type="submit" size="lg" className="w-full" disabled={busy}>
                {busy ? "Saving…" : editing ? "Save changes" : "Create item"}
              </Button>
            </form>
          </Card>
        </div>
      )}
    </AdminLayout>
  );
}
