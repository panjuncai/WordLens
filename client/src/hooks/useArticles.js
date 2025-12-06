import { useEffect, useState } from 'react';
import { message } from 'antd';
import {
  listArticles,
  createArticle,
  updateArticle,
  deleteArticle,
  getArticle,
} from '../services/articleService';

export default function useArticles(enabled = true) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!enabled) return;
    setLoading(true);
    try {
      const { data } = await listArticles();
      setItems(data.items || []);
    } catch {
      message.error('加载文章失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [enabled]);

  const createItem = async (title, content) => {
    setSaving(true);
    try {
      const { data } = await createArticle(title, content);
      setItems((prev) => [data.article, ...prev]);
      message.success('创建成功');
      return data.article;
    } catch (error) {
      message.error(error.response?.data?.error || '创建失败');
      return null;
    } finally {
      setSaving(false);
    }
  };

  const updateItem = async (id, title, content) => {
    setSaving(true);
    try {
      const { data } = await updateArticle(id, title, content);
      setItems((prev) => prev.map((it) => (it.id === id ? data.article : it)));
      message.success('更新成功');
      return data.article;
    } catch (error) {
      message.error(error.response?.data?.error || '更新失败');
      return null;
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = async (id) => {
    setSaving(true);
    try {
      await deleteArticle(id);
      setItems((prev) => prev.filter((it) => it.id !== id));
      message.success('已删除');
    } catch (error) {
      message.error(error.response?.data?.error || '删除失败');
    } finally {
      setSaving(false);
    }
  };

  return {
    items,
    loading,
    saving,
    load,
    createItem,
    updateItem,
    deleteItem,
    fetchItem: async (id) => {
      try {
        const { data } = await getArticle(id);
        return data.article;
      } catch {
        message.error('加载文章失败');
        return null;
      }
    },
  };
}
