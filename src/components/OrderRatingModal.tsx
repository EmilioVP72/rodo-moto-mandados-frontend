import React, { useState } from 'react';
import { Order } from '../types';
import { updateOrderInDb } from '../services/db';
import { Star, Bike, Utensils, X, CheckCircle, Loader2 } from 'lucide-react';
import { vibrateSuccess } from '../utils/haptics';
import { useLanguage } from '../utils/i18n';

interface OrderRatingModalProps {
  order: Order | null;
  onClose: () => void;
  onSubmitted?: (orderId: string) => void;
}

export const OrderRatingModal: React.FC<OrderRatingModalProps> = ({
  order,
  onClose,
  onSubmitted,
}) => {
  const { t, lang } = useLanguage();
  const [riderStars, setRiderStars] = useState<number>(5);
  const [foodStars, setFoodStars] = useState<number>(5);
  const [comment, setComment] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);
  const [done, setDone] = useState<boolean>(false);

  if (!order) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const overall = Math.round((riderStars + foodStars) / 2);
      await updateOrderInDb(order.id, {
        riderRating: riderStars,
        foodRating: foodStars,
        rating: overall,
        ratingComment: comment.trim(),
        ratedAt: now,
        receptionConfirmed: true,
        receptionConfirmedAt: order.receptionConfirmedAt || now,
      });
      vibrateSuccess();
      setDone(true);
      if (onSubmitted) onSubmitted(order.id);
      setTimeout(() => {
        onClose();
      }, 1100);
    } catch (err) {
      console.error('Error guardando calificación:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-amber-200 dark:border-slate-700 my-auto animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-gradient-to-r from-[#101b29] to-[#233349] text-white p-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-300 block">
              {order.folio} · {order.restaurantName}
            </span>
            <h3 className="font-black text-base">{t('rateOrderTitle')}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {done ? (
          <div className="p-8 text-center space-y-2">
            <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto" />
            <h4 className="font-black text-base text-gray-900 dark:text-white">
              {lang === 'en' ? 'Thank you for your feedback!' : '¡Gracias por tu calificación!'}
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {lang === 'en'
                ? 'Your review helps us keep San Miguel delivery fast and reliable.'
                : 'Tu opinión nos ayuda a mejorar el servicio en San Miguel de Allende.'}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
            {/* Repartidor */}
            <div className="bg-amber-50/70 dark:bg-slate-800 border border-amber-200 dark:border-slate-700 rounded-2xl p-3.5 space-y-1.5">
              <div className="flex items-center justify-between font-bold text-gray-800 dark:text-gray-100">
                <span className="flex items-center gap-1.5">
                  <Bike className="w-4 h-4 text-[#ed0718]" />
                  {lang === 'en' ? 'Rider Service' : 'Servicio del Repartidor'}
                </span>
                <span className="text-amber-600 font-mono">{riderStars}/5</span>
              </div>
              <div className="flex items-center gap-1.5 pt-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setRiderStars(s)}
                    className="p-1 hover:scale-125 transition cursor-pointer"
                  >
                    <Star
                      className={`w-7 h-7 ${
                        s <= riderStars ? 'fill-amber-400 text-amber-500' : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Establecimiento / Producto */}
            <div className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-3.5 space-y-1.5">
              <div className="flex items-center justify-between font-bold text-gray-800 dark:text-gray-100">
                <span className="flex items-center gap-1.5">
                  <Utensils className="w-4 h-4 text-blue-600" />
                  {lang === 'en' ? 'Establishment & Quality' : 'Local y Calidad del Pedido'}
                </span>
                <span className="text-amber-600 font-mono">{foodStars}/5</span>
              </div>
              <div className="flex items-center gap-1.5 pt-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setFoodStars(s)}
                    className="p-1 hover:scale-125 transition cursor-pointer"
                  >
                    <Star
                      className={`w-7 h-7 ${
                        s <= foodStars ? 'fill-amber-400 text-amber-500' : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                {lang === 'en' ? 'Optional comment:' : 'Comentario opcional:'}
              </label>
              <textarea
                rows={2}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={
                  lang === 'en'
                    ? 'Fast delivery and hot food...'
                    : 'Ej. Llegó muy rápido y todo bien empacado...'
                }
                className="w-full border border-gray-300 dark:border-slate-700 rounded-xl p-2.5 text-xs bg-white dark:bg-slate-800 text-gray-900 dark:text-white outline-none focus:border-[#ed0718]"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-gray-300 dark:border-slate-700 text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                {lang === 'en' ? 'Later' : 'Después'}
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-[#ed0718] hover:bg-[#c90012] text-white font-black py-2.5 rounded-xl shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Star className="w-4 h-4 fill-white" />
                    <span>{lang === 'en' ? 'Submit Rating' : 'Enviar Calificación'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
