import {
  ArrowDownCircle,
  ArrowLeftRight,
  ArrowRight,
  ArrowRightCircle,
  ArrowUpCircle,
  Banknote,
  BarChart,
  BookOpen,
  Camera,
  Car,
  Check,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Circle,
  CircleAlert,
  Clock,
  Code,
  CreditCard,
  Delete,
  Eye,
  EyeOff,
  FileText,
  Fingerprint,
  Flashlight,
  FlashlightOff,
  Fuel,
  Gauge,
  Heart,
  Home,
  Inbox,
  IndianRupee,
  Landmark,
  Lightbulb,
  List,
  Lock,
  LogOut,
  Mail,
  PieChart,
  Plane,
  PlusCircle,
  QrCode,
  RefreshCw,
  Send,
  ShieldCheck,
  ShoppingBag,
  ShoppingBasket,
  Tag,
  TrendingUp,
  TriangleAlert,
  Tv,
  User,
  UserCircle,
  Utensils,
  Wallet,
  X,
  XCircle,
  Zap,
} from 'lucide-react-native';
import { OpaqueColorValue, StyleProp, ViewStyle } from 'react-native';
import { SvgProps } from 'react-native-svg';

type LucideIcon = React.ComponentType<SvgProps & { size?: number | string; color?: string }>;

const MAPPING: Record<string, LucideIcon> = {
  'house.fill': Home,
  'paperplane.fill': Send,
  'chevron.left.forwardslash.chevron.right': Code,
  'chevron.right': ChevronRight,
  'chevron.left': ChevronLeft,
  'chart.bar.fill': BarChart,
  'lightbulb.fill': Lightbulb,
  'creditcard.fill': CreditCard,
  'creditcard': CreditCard,
  'chart.line.uptrend.xyaxis': TrendingUp,
  'speedometer': Gauge,
  'chart.pie.fill': PieChart,
  'exclamationmark.triangle.fill': TriangleAlert,
  'exclamationmark.circle.fill': CircleAlert,
  'checkmark.shield.fill': ShieldCheck,
  'fork.knife': Utensils,
  'basket.fill': ShoppingBasket,
  'car.fill': Car,
  'fuelpump.fill': Fuel,
  'bag.fill': ShoppingBag,
  'tv.fill': Tv,
  'bolt.fill': Zap,
  'heart.fill': Heart,
  'book.fill': BookOpen,
  'airplane': Plane,
  'doc.text.fill': FileText,
  'arrow.left.arrow.right.circle': ArrowLeftRight,
  'circle.fill': Circle,
  'checkmark': Check,
  'delete.left': Delete,
  'xmark': X,
  'faceid': Fingerprint,
  'building.columns.fill': Landmark,
  'checkmark.circle.fill': CheckCircle,
  'clock.fill': Clock,
  'camera.fill': Camera,
  'tray': Inbox,
  'banknote': Banknote,
  'plus.circle': PlusCircle,
  'arrow.right.circle': ArrowRightCircle,
  'arrow.left.arrow.right': ArrowLeftRight,
  'list.bullet': List,
  'person.fill': User,
  'envelope.fill': Mail,
  'lock.fill': Lock,
  'indianrupeesign.circle.fill': IndianRupee,
  'eye.fill': Eye,
  'eye.slash.fill': EyeOff,
  'flashlight.on.fill': Flashlight,
  'flashlight.off.fill': FlashlightOff,
  'person.circle.fill': UserCircle,
  'tag.fill': Tag,
  'arrow.right': ArrowRight,
  'xmark.circle.fill': XCircle,
  'rectangle.portrait.and.arrow.right': LogOut,
  'wallet.pass': Wallet,
  'arrow.clockwise': RefreshCw,
  'qrcode': QrCode,
  'arrow.up.circle.fill': ArrowUpCircle,
  'arrow.down.circle.fill': ArrowDownCircle,
  'wallet.pass.fill': Wallet,
};

export type IconSymbolName = keyof typeof MAPPING;

/**
 * An icon component that uses Lucide icons.
 * This ensures a consistent look across platforms, and optimal resource usage.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<ViewStyle>;
  weight?: any;
}) {
  const Icon = MAPPING[name];
  if (!Icon) {
    console.warn(`Icon "${name}" not found in mapping.`);
    return null;
  }
  // Cast color to string because Lucide expects string, but React Native allows OpaqueColorValue
  return <Icon color={color as string} size={size} style={style} />;
}
