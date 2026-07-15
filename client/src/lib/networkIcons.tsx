import { Facebook, Instagram, Youtube, type LucideIcon } from 'lucide-react';
import type { Network } from '../services/metricoolApi';

/** One place mapping a network to its icon, so the sidebar and the content
 * header can't drift out of sync with each other. */
export const NETWORK_ICON: Record<Network, LucideIcon> = {
    facebook: Facebook,
    instagram: Instagram,
    youtube: Youtube,
};
