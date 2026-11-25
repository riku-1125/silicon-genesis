/**
 * SILICON GENESIS — Cast of Shelter ARK-7
 */

export const CHARACTERS = {
  kagari: {
    id: 'kagari',
    name: '篝（カガリ）博士',
    role: '計算機歴史学者・旧文明復元主任',
    portrait: './assets/portrait_kagari.jpg',
    color: '#ffb347',
    bgTint: 'rgba(255, 179, 71, 0.14)',
  },
  mina: {
    id: 'mina',
    name: '湊 ミナ',
    role: 'アーク7 生命維持・配給管理官',
    portrait: './assets/portrait_mina.jpg',
    color: '#52e3b6',
    bgTint: 'rgba(82, 227, 182, 0.14)',
  },
  hako: {
    id: 'hako',
    name: 'ハコ (A.R.C.-0)',
    role: '非常用リレー診断端末',
    portrait: './assets/portrait_hako.jpg',
    color: '#f2994a',
    bgTint: 'rgba(242, 153, 74, 0.16)',
  },
  kai: {
    id: 'kai',
    name: 'カイ（アーク3）',
    role: 'アーク3 地上開拓隊チーフ・電力設備技師',
    portrait: './assets/portrait_kai.jpg',
    color: '#56ccf2',
    bgTint: 'rgba(86, 204, 242, 0.16)',
  },
  ren: {
    id: 'ren',
    name: 'レン（アーク5）',
    role: 'アーク5 北方気象観測シェルター通信技師',
    portrait: './assets/portrait_ren.jpg',
    color: '#7ee8ff',
    bgTint: 'rgba(126, 232, 255, 0.16)',
  },
};

export const SCENES = {
  shelter_hub: {
    id: 'shelter_hub',
    image: './assets/scene_shelter_hub.jpg',
    label: 'ARK-7 中央制御室',
  },
  machinery: {
    id: 'machinery',
    image: './assets/scene_machinery.jpg',
    label: 'B4 生命維持・リレー区画',
  },
  surface_rover: {
    id: 'surface_rover',
    image: './assets/scene_surface_rover.jpg',
    label: '地上探査ローバー通信波',
  },
  horizon_camp: {
    id: 'horizon_camp',
    image: './assets/scene_horizon_camp.jpg',
    label: '開拓拠点ホライズン（地上）',
  },
  ark5_station: {
    id: 'ark5_station',
    image: './assets/scene_ark5_station.jpg',
    label: 'ホライズン電算司令室',
  },
  storm_core: {
    id: 'storm_core',
    image: './assets/scene_storm_core.jpg',
    label: 'ホライズン電算司令室・磁気嵐警戒',
  },
};
