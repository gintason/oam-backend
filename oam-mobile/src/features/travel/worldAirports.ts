/* Generated from OurAirports (public domain): every airport with scheduled
 * passenger flights and an IATA code — 4008 airports in 233 countries.
 * Lets travellers search domestic flights in any country. */
import type { Airport } from "./reference";

const COUNTRIES: Record<string, [string, string]> = {
  AE: ["UAE", "Middle East"],
  AF: ["Afghanistan", "Asia"],
  AG: ["Antigua and Barbuda", "North America"],
  AI: ["Anguilla", "North America"],
  AL: ["Albania", "Europe"],
  AM: ["Armenia", "Asia"],
  AO: ["Angola", "Africa"],
  AR: ["Argentina", "South America"],
  AS: ["American Samoa", "Oceania"],
  AT: ["Austria", "Europe"],
  AU: ["Australia", "Oceania"],
  AW: ["Aruba", "North America"],
  AZ: ["Azerbaijan", "Asia"],
  BA: ["Bosnia and Herzegovina", "Europe"],
  BB: ["Barbados", "North America"],
  BD: ["Bangladesh", "Asia"],
  BE: ["Belgium", "Europe"],
  BF: ["Burkina Faso", "Africa"],
  BG: ["Bulgaria", "Europe"],
  BH: ["Bahrain", "Middle East"],
  BI: ["Burundi", "Africa"],
  BJ: ["Benin", "Africa"],
  BL: ["Saint Barthélemy", "North America"],
  BM: ["Bermuda", "North America"],
  BN: ["Brunei", "Asia"],
  BO: ["Bolivia", "South America"],
  BQ: ["Caribbean Netherlands", "North America"],
  BR: ["Brazil", "South America"],
  BS: ["Bahamas", "North America"],
  BT: ["Bhutan", "Asia"],
  BW: ["Botswana", "Africa"],
  BY: ["Belarus", "Europe"],
  BZ: ["Belize", "North America"],
  CA: ["Canada", "North America"],
  CC: ["Cocos (Keeling) Islands", "Asia"],
  CD: ["Democratic Republic of the Congo", "Africa"],
  CF: ["Central African Republic", "Africa"],
  CG: ["Republic of the Congo", "Africa"],
  CH: ["Switzerland", "Europe"],
  CI: ["Côte d'Ivoire", "Africa"],
  CK: ["Cook Islands", "Oceania"],
  CL: ["Chile", "South America"],
  CM: ["Cameroon", "Africa"],
  CN: ["China", "Asia"],
  CO: ["Colombia", "South America"],
  CR: ["Costa Rica", "North America"],
  CU: ["Cuba", "North America"],
  CV: ["Cape Verde", "Africa"],
  CW: ["Curaçao", "North America"],
  CX: ["Christmas Island", "Asia"],
  CY: ["Cyprus", "Asia"],
  CZ: ["Czech Republic", "Europe"],
  DE: ["Germany", "Europe"],
  DJ: ["Djibouti", "Africa"],
  DK: ["Denmark", "Europe"],
  DM: ["Dominica", "North America"],
  DO: ["Dominican Republic", "North America"],
  DZ: ["Algeria", "Africa"],
  EC: ["Ecuador", "South America"],
  EE: ["Estonia", "Europe"],
  EG: ["Egypt", "Africa"],
  EH: ["Western Sahara", "Africa"],
  ER: ["Eritrea", "Africa"],
  ES: ["Spain", "Europe"],
  ET: ["Ethiopia", "Africa"],
  FI: ["Finland", "Europe"],
  FJ: ["Fiji", "Oceania"],
  FK: ["Falkland Islands", "South America"],
  FM: ["Micronesia", "Oceania"],
  FO: ["Faroe Islands", "Europe"],
  FR: ["France", "Europe"],
  GA: ["Gabon", "Africa"],
  GB: ["United Kingdom", "Europe"],
  GD: ["Grenada", "North America"],
  GE: ["Georgia", "Asia"],
  GF: ["French Guiana", "South America"],
  GG: ["Guernsey", "Europe"],
  GH: ["Ghana", "Africa"],
  GI: ["Gibraltar", "Europe"],
  GL: ["Greenland", "North America"],
  GM: ["Gambia", "Africa"],
  GN: ["Guinea", "Africa"],
  GP: ["Guadeloupe", "North America"],
  GQ: ["Equatorial Guinea", "Africa"],
  GR: ["Greece", "Europe"],
  GT: ["Guatemala", "North America"],
  GU: ["Guam", "Oceania"],
  GW: ["Guinea-Bissau", "Africa"],
  GY: ["Guyana", "South America"],
  HK: ["Hong Kong", "Asia"],
  HN: ["Honduras", "North America"],
  HR: ["Croatia", "Europe"],
  HT: ["Haiti", "North America"],
  HU: ["Hungary", "Europe"],
  ID: ["Indonesia", "Asia"],
  IE: ["Ireland", "Europe"],
  IL: ["Israel", "Middle East"],
  IM: ["Isle of Man", "Europe"],
  IN: ["India", "Asia"],
  IQ: ["Iraq", "Middle East"],
  IR: ["Iran", "Middle East"],
  IS: ["Iceland", "Europe"],
  IT: ["Italy", "Europe"],
  JE: ["Jersey", "Europe"],
  JM: ["Jamaica", "North America"],
  JO: ["Jordan", "Middle East"],
  JP: ["Japan", "Asia"],
  KE: ["Kenya", "Africa"],
  KG: ["Kyrgyzstan", "Asia"],
  KH: ["Cambodia", "Asia"],
  KI: ["Kiribati", "Oceania"],
  KM: ["Comoros", "Africa"],
  KN: ["Saint Kitts and Nevis", "North America"],
  KP: ["North Korea", "Asia"],
  KR: ["South Korea", "Asia"],
  KW: ["Kuwait", "Middle East"],
  KY: ["Cayman Islands", "North America"],
  KZ: ["Kazakhstan", "Asia"],
  LA: ["Laos", "Asia"],
  LB: ["Lebanon", "Middle East"],
  LC: ["Saint Lucia", "North America"],
  LK: ["Sri Lanka", "Asia"],
  LR: ["Liberia", "Africa"],
  LS: ["Lesotho", "Africa"],
  LT: ["Lithuania", "Europe"],
  LU: ["Luxembourg", "Europe"],
  LV: ["Latvia", "Europe"],
  LY: ["Libya", "Africa"],
  MA: ["Morocco", "Africa"],
  MD: ["Moldova", "Europe"],
  ME: ["Montenegro", "Europe"],
  MF: ["Saint Martin", "North America"],
  MG: ["Madagascar", "Africa"],
  MH: ["Marshall Islands", "Oceania"],
  MK: ["North Macedonia", "Europe"],
  ML: ["Mali", "Africa"],
  MM: ["Myanmar", "Asia"],
  MN: ["Mongolia", "Asia"],
  MO: ["Macau", "Asia"],
  MP: ["Northern Mariana Islands", "Oceania"],
  MQ: ["Martinique", "North America"],
  MR: ["Mauritania", "Africa"],
  MS: ["Montserrat", "North America"],
  MT: ["Malta", "Europe"],
  MU: ["Mauritius", "Africa"],
  MV: ["Maldives", "Asia"],
  MW: ["Malawi", "Africa"],
  MX: ["Mexico", "North America"],
  MY: ["Malaysia", "Asia"],
  MZ: ["Mozambique", "Africa"],
  NA: ["Namibia", "Africa"],
  NC: ["New Caledonia", "Oceania"],
  NE: ["Niger", "Africa"],
  NF: ["Norfolk Island", "Oceania"],
  NG: ["Nigeria", "Nigeria"],
  NI: ["Nicaragua", "North America"],
  NL: ["Netherlands", "Europe"],
  NO: ["Norway", "Europe"],
  NP: ["Nepal", "Asia"],
  NR: ["Nauru", "Oceania"],
  NU: ["Niue", "Oceania"],
  NZ: ["New Zealand", "Oceania"],
  OM: ["Oman", "Middle East"],
  PA: ["Panama", "North America"],
  PE: ["Peru", "South America"],
  PF: ["French Polynesia", "Oceania"],
  PG: ["Papua New Guinea", "Oceania"],
  PH: ["Philippines", "Asia"],
  PK: ["Pakistan", "Asia"],
  PL: ["Poland", "Europe"],
  PM: ["Saint Pierre and Miquelon", "North America"],
  PR: ["Puerto Rico", "North America"],
  PT: ["Portugal", "Europe"],
  PW: ["Palau", "Oceania"],
  PY: ["Paraguay", "South America"],
  QA: ["Qatar", "Middle East"],
  RE: ["Réunion", "Africa"],
  RO: ["Romania", "Europe"],
  RS: ["Serbia", "Europe"],
  RU: ["Russia", "Europe"],
  RW: ["Rwanda", "Africa"],
  SA: ["Saudi Arabia", "Middle East"],
  SB: ["Solomon Islands", "Oceania"],
  SC: ["Seychelles", "Africa"],
  SD: ["Sudan", "Africa"],
  SE: ["Sweden", "Europe"],
  SG: ["Singapore", "Asia"],
  SH: ["Saint Helena", "Africa"],
  SI: ["Slovenia", "Europe"],
  SK: ["Slovakia", "Europe"],
  SL: ["Sierra Leone", "Africa"],
  SN: ["Senegal", "Africa"],
  SO: ["Somalia", "Africa"],
  SR: ["Suriname", "South America"],
  SS: ["South Sudan", "Africa"],
  ST: ["São Tomé and Principe", "Africa"],
  SV: ["El Salvador", "North America"],
  SX: ["Sint Maarten", "North America"],
  SY: ["Syria", "Middle East"],
  SZ: ["Eswatini", "Africa"],
  TC: ["Turks and Caicos Islands", "North America"],
  TD: ["Chad", "Africa"],
  TG: ["Togo", "Africa"],
  TH: ["Thailand", "Asia"],
  TJ: ["Tajikistan", "Asia"],
  TL: ["Timor-Leste", "Asia"],
  TM: ["Turkmenistan", "Asia"],
  TN: ["Tunisia", "Africa"],
  TO: ["Tonga", "Oceania"],
  TR: ["Türkiye", "Europe"],
  TT: ["Trinidad and Tobago", "North America"],
  TV: ["Tuvalu", "Oceania"],
  TW: ["Taiwan", "Asia"],
  TZ: ["Tanzania", "Africa"],
  UG: ["Uganda", "Africa"],
  UM: ["U.S. Minor Outlying Islands", "Oceania"],
  US: ["USA", "North America"],
  UY: ["Uruguay", "South America"],
  UZ: ["Uzbekistan", "Asia"],
  VC: ["Saint Vincent and the Grenadines", "North America"],
  VE: ["Venezuela", "South America"],
  VG: ["British Virgin Islands", "North America"],
  VI: ["U.S. Virgin Islands", "North America"],
  VN: ["Vietnam", "Asia"],
  VU: ["Vanuatu", "Oceania"],
  WF: ["Wallis and Futuna", "Oceania"],
  WS: ["Samoa", "Oceania"],
  XK: ["Kosovo", "Europe"],
  YE: ["Yemen", "Middle East"],
  YT: ["Mayotte", "Africa"],
  ZA: ["South Africa", "Africa"],
  ZM: ["Zambia", "Africa"],
  ZW: ["Zimbabwe", "Africa"],
};

// code|city|country|airport name — biggest airports first
const DATA = `AUH|Abu Dhabi|AE|Zayed International
AAN|Al Ain|AE|Al Ain International
DXB|Dubai|AE|Dubai International
DWC|Dubai(Jebel Ali)|AE|Al Maktoum International
FJR|Fujairah|AE|Fujairah International
RKT|Ras Al Khaimah|AE|Ras Al Khaimah International
SHJ|Sharjah|AE|Sharjah International
HEA|Guzara|AF|Herat - Khwaja Abdullah Ansari International
KBL|Kabul|AF|Kabul International
KDH|Kandahar|AF|Ahmad Shah Baba International
MZR|Mazar-i-Sharif|AF|Mazar-i-Sharif International
ANU|Osbourn|AG|V. C. Bird International
TIA|Rinas|AL|Tirana International Airport Mother Teresa
LWN|Gyumri|AM|Shirak International
EVN|Yerevan|AM|Zvartnots International
LAD|Luanda|AO|Quatro de Fevereiro International
NBJ|Luanda (Ícolo e Bengo)|AO|Dr. Antonio Agostinho Neto International
AEP|Buenos Aires|AR|Aeroparque Jorge Newbery
EZE|Buenos Aires (Ezeiza)|AR|Ezeiza International Airport - Ministro Pistarini
CRD|Comodoro Rivadavia|AR|General Enrique Mosconi International
COR|Cordoba|AR|Ingeniero Aeronáutico Ambrosio L.V. Taravella International
MDZ|Mendoza|AR|Governor Francisco Gabrielli International
NQN|Neuquén|AR|Presidente Perón International
RES|Resistencia|AR|Resistencia International
RGL|Rio Gallegos|AR|Piloto Civil Norberto Fernández International
ROS|Rosario|AR|Rosario Islas Malvinas International
SLA|Salta|AR|Martín Miguel de Güemes International
BRC|San Carlos de Bariloche|AR|Teniente Luis Candelaria International
TUC|San Miguel de Tucumán|AR|Teniente Benjamín Matienzo International
JUJ|San Salvador de Jujuy|AR|Gobernador Horacio Guzman International
PPG|Pago Pago|AS|Pago Pago International
GRZ|Feldkirchen bei Graz|AT|Graz
INN|Innsbruck|AT|Innsbruck
KLU|Klagenfurt am Wörthersee|AT|Klagenfurt
LNZ|Linz|AT|Linz-Hörsching
SZG|Salzburg|AT|Salzburg
VIE|Vienna|AT|Vienna International
ADL|Adelaide|AU|Adelaide International
BNE|Brisbane|AU|Brisbane International
BME|Broome|AU|Broome International
CNS|Cairns|AU|Cairns International
DRW|Darwin|AU|Darwin International Airport / RAAF Darwin
AVV|Geelong/Melbourne|AU|Melbourne Avalon International
OOL|Gold Coast|AU|Gold Coast
HBA|Hobart (Cambridge)|AU|Hobart International
MCY|Maroochydore|AU|Sunshine Coast
MEL|Melbourne|AU|Melbourne
PER|Perth|AU|Perth International
PHE|Port Hedland|AU|Port Hedland International
SYD|Sydney (Mascot)|AU|Sydney Kingsford Smith International
WTB|Toowoomba|AU|Toowoomba Wellcamp
NTL|Williamtown|AU|Newcastle
AUA|Oranjestad|AW|Queen Beatrix International
GYD|Baku|AZ|Heydar Aliyev International
GNJ|Ganja|AZ|Ganja International
NAJ|Nakhchivan|AZ|Nakhchivan International
TZL|Dubrave Gornje|BA|Tuzla International
BNX|Mahovljani|BA|Banja Luka International
OMO|Mostar|BA|Mostar International
SJJ|Sarajevo|BA|Sarajevo International
BGI|Bridgetown|BB|Grantley Adams International
CGP|Chattogram (Chittagong)|BD|Shah Amanat International
DAC|Dhaka|BD|Hazrat Shahjalal International
ZYL|Sylhet|BD|Osmany International
CRL|Charleroi|BE|Brussels South Charleroi
OST|Oostende|BE|Ostend-Bruges International
BRU|Zaventem|BE|Brussels
BOY|Bobo Dioulasso|BF|Bobo Dioulasso
OUA|Ouagadougou|BF|Ouagadougou Thomas Sankara International
BOJ|Burgas|BG|Burgas
PDV|Plovdiv|BG|Plovdiv International
SOF|Sofia|BG|Sofia
VAR|Varna|BG|Varna
BAH|Manama|BH|Bahrain International
BJM|Bujumbura|BI|Bujumbura Melchior Ndadaye International
COO|Cotonou|BJ|Cotonou Cadjehoun International
BDA|Hamilton|BM|L.F. Wade International
BWN|Bandar Seri Begawan|BN|Brunei International
CBB|Cochabamba|BO|Jorge Wilsterman International
LPB|La Paz / El Alto|BO|El Alto International
ORU|Oruro|BO|Juan Mendoza International
UYU|Quijarro|BO|Joya Andina International
VVI|Santa Cruz|BO|Viru Viru International
SRE|Sucre|BO|Alcantarí International
BON|Kralendijk|BQ|Flamingo International
CNF|Belo Horizonte|BR|Tancredo Neves International
BEL|Belém|BR|Val de Cans/Júlio Cezar Ribeiro International
BVB|Boa Vista|BR|Atlas Brasil Cantanhede International
BSB|Brasília|BR|Presidente Juscelino Kubitschek International
VCP|Campinas|BR|Viracopos International
CGB|Cuiabá|BR|Várzea Grande–Marechal Rondon International
CWB|Curitiba|BR|Curitiba-Afonso Pena International
FLN|Florianópolis|BR|Hercílio Luz International
FOR|Fortaleza|BR|Pinto Martins International
IGU|Foz do Iguaçu|BR|Cataratas International
GYN|Goiânia|BR|Santa Genoveva International
JPA|João Pessoa|BR|Presidente Castro Pinto International
MCZ|Maceió|BR|Zumbi dos Palmares International
MAO|Manaus|BR|Eduardo Gomes International
NAT|Natal|BR|Rio Grande do Norte/São Gonçalo do Amarante–Governador Aluízio Alves International
NVT|Navegantes|BR|Ministro Victor Konder International
POA|Porto Alegre|BR|Porto Alegre-Salgado Filho International
BPS|Porto Seguro|BR|Porto Seguro International
PVH|Porto Velho|BR|Governador Jorge Teixeira de Oliveira International
REC|Recife|BR|Recife/Guararapes - Gilberto Freyre International
RBR|Rio Branco|BR|Rio Branco-Plácido de Castro International
GIG|Rio De Janeiro|BR|Rio de Janeiro Galeão – Tom Jobim International
SDU|Rio de Janeiro|BR|Santos Dumont
SSA|Salvador|BR|Deputado Luiz Eduardo Magalhães International
SLZ|São Luís|BR|Marechal Cunha Machado International
GRU|São Paulo|BR|São Paulo/Guarulhos–Governor André Franco Montoro International
CGH|São Paulo|BR|Congonhas–Deputado Freitas Nobre
VIX|Vitória|BR|Eurico de Aguiar Salles International
FPO|Freeport|BS|Grand Bahama International
NAS|Nassau|BS|Lynden Pindling International
ZSA|San Salvador|BS|San Salvador International
PBH|Paro|BT|Paro International
FRW|Francistown|BW|Phillip Gaonwe Matante International
GBE|Gaborone|BW|Sir Seretse Khama International
BBK|Kasane|BW|Kasane International
MUB|Maun|BW|Maun International
BQT|Brest|BY|Brest International
MSQ|Minsk|BY|Minsk National
BZE|Belize City|BZ|Philip S. W. Goldson International
YYC|Calgary|CA|Calgary International
YEG|Edmonton|CA|Edmonton International
YHZ|Halifax|CA|Halifax / Stanfield International
YHM|Hamilton|CA|John C. Munro Hamilton International
YLW|Kelowna|CA|Kelowna International
YUL|Montréal|CA|Montreal / Pierre Elliott Trudeau International
YOW|Ottawa|CA|Ottawa Macdonald-Cartier International
YQB|Quebec|CA|Quebec Jean Lesage International
YXE|Saskatoon|CA|Saskatoon John G. Diefenbaker International
YYT|St. John's|CA|St. John's International
YYZ|Toronto|CA|Toronto Pearson International
YVR|Vancouver|CA|Vancouver International
YYJ|Victoria|CA|Victoria International
YQG|Windsor|CA|Windsor International
YWG|Winnipeg|CA|Winnipeg / James Armstrong Richardson International
CCK|West Island|CC|Cocos (Keeling) Islands
GOM|Goma|CD|Goma International
FIH|Kinshasa|CD|Ndjili International
FKI|Kisangani|CD|Bangoka International
FBM|Lubumbashi|CD|Lubumbashi International
BGF|Bangui|CF|Bangui M'Poko International
BZV|Brazzaville|CG|Maya-Maya International
PNR|Pointe Noire|CG|Antonio Agostinho-Neto International
GVA|Geneva|CH|Geneva International
ZRH|Zurich|CH|Zürich
ABJ|Abidjan|CI|Félix-Houphouët-Boigny International
RAR|Avarua|CK|Rarotonga International
ANF|Antofagasta|CL|Andrés Sabella Gálvez International
CCP|Concepcion|CL|Carriel Sur International
IQQ|Iquique|CL|Diego Aracena International
IPC|Isla De Pascua|CL|Mataveri International
PMC|Puerto Montt|CL|El Tepual International
PUQ|Punta Arenas|CL|President Carlos Ibáñez International
SCL|Santiago|CL|Comodoro Arturo Merino Benítez International
ZCO|Temuco|CL|La Araucanía International
DLA|Douala|CM|Douala International
GOU|Garoua|CM|Garoua International
NSI|Yaoundé|CM|Yaoundé Nsimalen International
BAV|Baotou|CN|Baotou Donghe International
PEK|Beijing|CN|Beijing Capital International
PKX|Beijing|CN|Beijing Daxing International
CGQ|Changchun|CN|Changchun Longjia International
CSX|Changsha (Changsha)|CN|Changsha Huanghua International
TFU|Chengdu (Jianyang)|CN|Chengdu Tianfu International
CTU|Chengdu (Shuangliu)|CN|Chengdu Shuangliu International
CKG|Chongqing|CN|Chongqing Jiangbei International
DLC|Dalian (Ganjingzi)|CN|Dalian Zhoushuizi International
DAT|Datong|CN|Datong Yungang International
DNH|Dunhuang|CN|Dunhuang Mogao International
EHU|Ezhou|CN|Ezhou Huahu International
FOC|Fuzhou (Changle)|CN|Fuzhou Changle International
CAN|Guangzhou (Huadu)|CN|Guangzhou Baiyun International
KWL|Guilin (Lingui)|CN|Guilin Liangjiang International
KWE|Guiyang (Nanming)|CN|Guiyang Longdongbao International
XNN|Haidong (Huzhu Tu Autonomous County)|CN|Xining Caojiabao International
HAK|Haikou (Meilan)|CN|Haikou Meilan International
HLD|Hailar|CN|Hulunbuir Hailar
HGH|Hangzhou|CN|Hangzhou Xiaoshan International
HRB|Harbin|CN|Harbin Taiping International
HFE|Hefei|CN|Hefei Xinqiao International
HET|Hohhot|CN|Hohhot Baita International
HIA|Huai'an|CN|Huai'an Lianshui
TXN|Huangshan|CN|Huangshan Tunxi International
JGN|Jiayuguan|CN|Jiayuguan International
SWA|Jieyang (Rongcheng)|CN|Jieyang Chaoshan International
TNA|Jinan (Licheng)|CN|Jinan Yaoqiang International
JHG|Jinghong (Gasa)|CN|Xishuangbanna Gasa International
KHG|Kashgar|CN|Kashgar Laining International
KMG|Kunming|CN|Kunming Changshui International
LHW|Lanzhou (Yongdeng)|CN|Lanzhou Zhongchuan International
LYG|Lianyungang|CN|Lianyungang Huaguoshan International
LJG|Lijiang|CN|Lijiang Sanyi International
LYA|Luoyang (Laocheng)|CN|Luoyang Beijiao
KHN|Nanchang|CN|Nanchang Changbei International
NKG|Nanjing|CN|Nanjing Lukou International
NNG|Nanning (Jiangnan)|CN|Nanning Wuxu International
NGB|Ningbo|CN|Ningbo Lishe International
DSN|Ordos|CN|Ordos Ejin Horo International
TAO|Qingdao (Jiaozhou)|CN|Qingdao Jiaodong International
NDG|Qiqihar|CN|Qiqihar Sanjiazi
JJN|Quanzhou|CN|Quanzhou Jinjiang International
SYX|Sanya (Tianya)|CN|Sanya Phoenix International
SHA|Shanghai (Minhang)|CN|Shanghai Hongqiao International
PVG|Shanghai (Pudong)|CN|Shanghai Pudong International
LXA|Shannan (Gonggar)|CN|Lhasa Gonggar International
SHE|Shenyang|CN|Shenyang Taoxian International
SZX|Shenzhen|CN|Shenzhen Bao'an International
SJW|Shijiazhuang|CN|Shijiazhuang Zhengding International
TYN|Taiyuan|CN|Taiyuan Wusu International
TSN|Tianjin|CN|Tianjin Binhai International
WNZ|Wenzhou (Longwan)|CN|Wenzhou Longwan International
WUH|Wuhan (Huangpi)|CN|Wuhan Tianhe International
WUX|Wuxi|CN|Sunan Shuofang International
XIY|Xi'an|CN|Xi'an Xianyang International
XMN|Xiamen|CN|Xiamen Gaoqi International
RKZ|Xigazê (Samzhubzê)|CN|Xigaze Peace Airport / Shigatse Air Base
YNZ|Yancheng (Tinghu)|CN|Yancheng Nanyang International
YNT|Yantai|CN|Yantai Penglai International
INC|Yinchuan|CN|Yinchuan Hedong International
YIW|Yiwu/Jinhua|CN|Yiwu
YCU|Yuncheng (Yanhu)|CN|Yuncheng Yanhu International
DYG|Zhangjiajie (Yongding)|CN|Zhangjiajie Hehua International
ZHA|Zhanjiang|CN|Zhanjiang Wuchuan International
CGO|Zhengzhou|CN|Zhengzhou Xinzheng International
HSN|Zhoushan|CN|Zhoushan Putuoshan International
ZUH|Zhuhai (Jinwan)|CN|Zhuhai Jinwan
URC|Ürümqi|CN|Ürümqi Tianshan International
BAQ|Barranquilla|CO|Ernesto Cortissoz International
BOG|Bogota|CO|El Dorado International
CLO|Cali|CO|Alfonso Bonilla Aragon International
CTG|Cartagena|CO|Rafael Nuñez International
MDE|Medellín|CO|Jose Maria Córdova International
ADZ|San Andrés|CO|Gustavo Rojas Pinilla International
LIR|Liberia|CR|Daniel Oduber Quirós International
SJO|San José (Alajuela)|CR|Juan Santamaría International
CMW|Camaguey|CU|Ignacio Agramonte International
HAV|Havana|CU|José Martí International
HOG|Holguin|CU|Frank Pais International
VRA|Matanzas|CU|Juan Gualberto Gomez International
SNU|Santa Clara|CU|Abel Santamaria International
SCU|Santiago|CU|Antonio Maceo International
SID|Espargos|CV|Amílcar Cabral International
RAI|Praia|CV|Nelson Mandela International
BVC|Rabil|CV|Aristides Pereira International
VXE|São Pedro|CV|Cesaria Evora International
CUR|Willemstad|CW|Hato International
LCA|Larnaca|CY|Larnaca International
PFO|Paphos|CY|Paphos International
ECN|Tymbou (Kirklar)|CY|Ercan International
KLV|Karlovy Vary|CZ|Karlovy Vary
OSR|Mošnov|CZ|Leoš Janáček Airport Ostrava
PED|Pardubice|CZ|Pardubice
PRG|Prague|CZ|Václav Havel Airport Prague
JCL|České Budějovice|CZ|České Budějovice South Bohemian
BER|Berlin|DE|Berlin Brandenburg
BRE|Bremen|DE|Bremen
PAD|Büren|DE|Paderborn Lippstadt
KSF|Calden|DE|Kassel
DTM|Dortmund|DE|Dortmund
DRS|Dresden|DE|Dresden
DUS|Düsseldorf|DE|Düsseldorf
ERF|Erfurt|DE|Erfurt-Weimar
FRA|Frankfurt am Main|DE|Frankfurt Main
HHN|Frankfurt am Main (Lautzenhausen)|DE|Frankfurt-Hahn
FDH|Friedrichshafen|DE|Bodensee Airport Friedrichshafen
FMO|Greven|DE|Münster Osnabrück
HAM|Hamburg|DE|Hamburg Helmut Schmidt
HAJ|Hannover|DE|Hannover
CGN|Köln (Cologne)|DE|Cologne Bonn
FMM|Memmingen|DE|Memmingen Allgau
MUC|Munich|DE|Munich
NUE|Nuremberg|DE|Nuremberg
FKB|Rheinmünster|DE|Karlsruhe Baden-Baden
LEJ|Schkeuditz|DE|Leipzig/Halle
STR|Stuttgart|DE|Stuttgart
NRN|Weeze|DE|Weeze (Niederrhein)
JIB|Djibouti City|DJ|Djibouti-Ambouli
AAL|Aalborg|DK|Aalborg
AAR|Aarhus|DK|Aarhus
BLL|Billund|DK|Billund
CPH|Copenhagen|DK|Copenhagen Kastrup
ODE|Odense|DK|Odense Hans Christian Andersen
LRM|La Romana|DO|Casa De Campo International
PUJ|Punta Cana|DO|Punta Cana International
STI|Santiago|DO|Cibao International
SDQ|Santo Domingo|DO|Las Américas International
ALG|Algiers|DZ|Houari Boumediene
AAE|Annaba|DZ|Annaba Rabah Bitat
BLJ|Batna|DZ|Batna Mostefa Ben Boulaid
BSK|Biskra|DZ|Biskra - Mohamed Khider
BJA|Béjaïa|DZ|Soummam–Abane Ramdane
CFK|Chlef|DZ|Chlef Aboubakr Belkaid International
CZL|Constantine|DZ|Mohamed Boudiaf International
DJG|Djanet|DZ|Tiska Djanet
ORN|Es-Sénia|DZ|Oran Es-Sénia (Ahmed Ben Bella) International
GJL|Tahir|DZ|Jijel Ferhat Abbas
TMR|Tamanrasset|DZ|Aguenar – Hadj Bey Akhamok
TLM|Zenata|DZ|Zenata – Messali El Hadj
GYE|Guayaquil|EC|José Joaquín de Olmedo International
UIO|Quito|EC|Mariscal Sucre International
SNC|Salinas/La Libertad|EC|General Ulpiano Paez International
ESM|Tachina|EC|Carlos Concha Torres International
TLL|Tallinn|EE|Lennart Meri Tallinn
SPX|Al Jiza|EG|Sphinx International
HBE|Alexandria|EG|Alexandria International
ASW|Aswan|EG|Aswan International
ATZ|Asyut|EG|Asyut International
CAI|Cairo|EG|Cairo International
DBB|El Alamein|EG|El Alamein International
AAC|El Arish|EG|El Arish International
HRG|Hurghada|EG|Hurghada International
LXR|Luxor|EG|Luxor International
RMF|Marsa Alam|EG|Marsa Alam International
MUH|Marsa Matruh|EG|Mersa Matruh International
PSD|Port Said|EG|Port Said International
SSH|Sharm El Sheikh|EG|Sharm El Sheikh International
HMB|Suhaj|EG|Suhaj International
VIL|Dakhla|EH|Dakhla
EUN|El Aaiún|EH|Laayoune Hassan I International
ALC|Alicante|ES|Alicante-Elche Miguel Hernández
BCN|Barcelona|ES|Josep Tarradellas Barcelona-El Prat
BIO|Bilbao|ES|Bilbao
RMU|Corvera|ES|Region of Murcia International
FUE|El Matorral|ES|Fuerteventura
GRO|Girona|ES|Girona-Costa Brava
LPA|Gran Canaria Island|ES|Gran Canaria
IBZ|Ibiza (Eivissa)|ES|Ibiza
MAD|Madrid|ES|Adolfo Suárez Madrid–Barajas
MAH|Mahón (Maó)|ES|Menorca
AGP|Málaga|ES|Málaga-Costa del Sol
PMI|Palma de Mallorca|ES|Palma de Mallorca
OVD|Ranón|ES|Asturias
REU|Reus|ES|Reus
ACE|San Bartolomé|ES|César Manrique-Lanzarote
SCQ|Santiago de Compostela|ES|Santiago-Rosalía de Castro
SVQ|Seville|ES|Seville
TFS|Tenerife|ES|Tenerife Sur
TFN|Tenerife|ES|Tenerife Norte-Ciudad de La Laguna
VLC|Valencia|ES|Valencia
ZAZ|Zaragoza|ES|Zaragoza
ADD|Addis Ababa|ET|Addis Ababa Bole International
DIR|Dire Dawa|ET|Aba Tenna Dejazmach Yilma International
AWA|Hawassa|ET|Hawassa International
JIJ|Jijiga|ET|Gerad Wilwal International
HEL|Helsinki (Vantaa)|FI|Helsinki Vantaa
IVL|Ivalo|FI|Ivalo
KTT|Kittilä|FI|Kittilä International
KUO|Kuopio / Siilinjärvi|FI|Kuopio
LPP|Lappeenranta|FI|Lappeenranta
OUL|Oulu / Oulunsalo|FI|Oulu
RVN|Rovaniemi|FI|Rovaniemi
TMP|Tampere / Pirkkala|FI|Tampere-Pirkkala
TKU|Turku|FI|Turku
VAA|Vaasa|FI|Vaasa
NAN|Nadi|FJ|Nadi International
SUV|Nausori|FJ|Nausori International
KSA|Okat|FM|Kosrae International
TKK|Weno Island|FM|Chuuk International
YAP|Yap Island|FM|Yap International
FAE|Vágar|FO|Vágar
BIA|Bastia|FR|Bastia-Poretta International airport
BVA|Beauvais|FR|Beauvais-Tillé airport
BOD|Bordeaux|FR|Bordeaux–Mérignac
BES|Brest|FR|Brest Bretagne airport
BSL|Bâle / Mulhouse|FR|EuroAirport Basel–Mulhouse–Freiburg
CFE|Clermont-Ferrand|FR|Clermont-Ferrand Auvergne airport
LYS|Colombier-Saugnieu, Rhône|FR|Lyon Saint-Exupéry
FSC|Figari|FR|Figari Sud-Corse
LIL|Lesquin|FR|Lille
MRS|Marignane, Bouches-du-Rhône|FR|Marseille Provence
MPL|Montpellier/Méditerranée|FR|Montpellier-Méditerranée
NTE|Nantes|FR|Nantes Atlantique
NCE|Nice, Alpes-Maritimes|FR|Nice-Côte d'Azur
ORY|Paris (Orly, Val-de-Marne)|FR|Paris-Orly
CDG|Paris (Roissy-en-France, Val-d'Oise)|FR|Charles de Gaulle International
SXB|Strasbourg|FR|Strasbourg
TLS|Toulouse/Blagnac|FR|Toulouse-Blagnac
LBV|Libreville|GA|Libreville Leon M'ba International
POG|Port Gentil|GA|Port Gentil International
ABZ|Aberdeen|GB|Aberdeen International
BFS|Belfast|GB|Belfast International
BHX|Birmingham, West Midlands|GB|Birmingham
BRS|Bristol|GB|Bristol
CWL|Cardiff|GB|Cardiff International
GLA|Glasgow|GB|Glasgow
EDI|Ingliston, Edinburgh|GB|Edinburgh
LBA|Leeds, West Yorkshire|GB|Leeds Bradford
LPL|Liverpool|GB|Liverpool John Lennon
LGW|London|GB|London Gatwick
LHR|London|GB|London Heathrow
STN|London, Essex|GB|London Stansted
LTN|Luton, Luton|GB|London Luton
MAN|Manchester, Greater Manchester|GB|Manchester
NCL|Newcastle upon Tyne, Tyne and Wear|GB|Newcastle International
EMA|Nottingham, Leicestershire|GB|East Midlands
PIK|Prestwick, South Ayrshire|GB|Glasgow Prestwick
GND|Saint George's|GD|Maurice Bishop International
BUS|Batumi|GE|Alexander Kartveli Batumi International
KUT|Kopitnari|GE|David the Builder Kutaisi International
SUI|Sukhumi|GE|Vladislav Ardzinba Sukhum International
TBS|Tbilisi|GE|Tbilisi International
CAY|Matoury|GF|Cayenne – Félix Eboué
ACC|Accra|GH|Kotoka International
KMS|Kumasi|GH|Prempeh I International
TML|Tamale|GH|Yakubu Tali International
GIB|Gibraltar|GI|Gibraltar
GOH|Nuuk|GL|Nuuk International
BJL|Banjul (Yundum)|GM|Banjul International
CKY|Conakry|GN|Ahmed Sékou Touré International
PTP|Pointe-à-Pitre|GP|Maryse Condé International
BSG|Bata|GQ|Bata International
OCS|Corisco Island|GQ|Corisco International
SSG|Malabo|GQ|Malabo International
HER|Heraklion|GR|Heraklion International Nikos Kazantzakis
KVA|Kavala|GR|Kavala Alexander the Great International
EFL|Kefallinia Island|GR|Kefalonia International Airport "Anna Pollatou"
CFU|Kerkyra (Corfu)|GR|Corfu Ioannis Kapodistrias International
KGS|Kos Island|GR|Kos International Airport "Ippokratis"
RHO|Rhodes|GR|Rhodes International Airport "Diagoras"
JTR|Santorini Island|GR|Santorini International
CHQ|Souda|GR|Chania International
ATH|Spata-Artemida|GR|Athens Eleftherios Venizelos International
SKG|Thessaloniki|GR|Thessaloniki Macedonia International
ZTH|Zakynthos|GR|Zakynthos International Airport "Dionysios Solomos"
GUA|Guatemala City|GT|La Aurora International
GUM|Hagåtña|GU|Antonio B. Won Pat International
OXB|Bissau|GW|Osvaldo Vieira International
GEO|Georgetown|GY|Cheddi Jagan International
HKG|Hong Kong|HK|Hong Kong International
RTB|Coxen Hole|HN|Juan Manuel Gálvez International
XPL|Palmerola|HN|Palmerola International
SAP|San Pedro Sula|HN|Ramón Villeda Morales International
DBV|Dubrovnik|HR|Dubrovnik Ruđer Bošković
PUY|Pula|HR|Pula
RJK|Rijeka(Omišalj)|HR|Rijeka
SPU|Split|HR|Split Saint Jerome
ZAG|Velika Gorica|HR|Zagreb Franjo Tuđman International
ZAD|Zadar|HR|Zadar
CAP|Cap Haitien|HT|Cap Haitien International
PAP|Port-au-Prince|HT|Toussaint Louverture International
BUD|Budapest|HU|Budapest Liszt Ferenc International
DEB|Debrecen|HU|Debrecen International
PEV|Pécs|HU|Pécs-Pogány International
AMQ|Ambon|ID|Pattimura International
BPN|Balikpapan|ID|Sultan Aji Muhammad Sulaiman Sepinggan International
BTJ|Banda Aceh|ID|Sultan Iskandar Muda International
BDJ|Banjarbaru|ID|Syamsudin Noor International
BTH|Batam|ID|Hang Nadim International
KNO|Beringin|ID|Kualanamu International
HLP|Jakarta|ID|Halim Perdanakusuma International
CGK|Jakarta|ID|Soekarno-Hatta International
DPS|Kuta, Badung|ID|Denpasar I Gusti Ngurah Rai International
UPG|Makassar|ID|Sultan Hasanuddin International
MDC|Manado|ID|Sam Ratulangi International
LOP|Mataram (Pujut, Lombok Tengah)|ID|Lombok International
PDG|Padang (Katapiang)|ID|Minangkabau International
PNK|Pontianak|ID|Supadio International
SRG|Semarang|ID|Jenderal Ahmad Yani
DJJ|Sentani|ID|Dortheys Hiyo Eluay International
SUB|Surabaya|ID|Juanda International
SOC|Surakarta|ID|Adisoemarmo International
YIA|Yogyakarta|ID|Yogyakarta International
NOC|Charlestown|IE|Ireland West Airport Knock
ORK|Cork|IE|Cork International
DUB|Dublin|IE|Dublin
SNN|Shannon|IE|Shannon
ETM|Eilat|IL|Ramon International
TLV|Tel Aviv|IL|Ben Gurion International
IOM|Castletown, Rushen|IM|Isle of Man
AMD|Ahmedabad|IN|Sardar Vallabh Patel International
ATQ|Amritsar|IN|Sri Guru Ram Das Ji International
BLR|Bengaluru|IN|Kempegowda International Airport Bengaluru
BHO|Bhopal|IN|Raja Bhoj International
BBI|Bhubaneswar|IN|Biju Patnaik International
CCJ|Calicut|IN|Calicut International
IXC|Chandigarh|IN|Shaheed Bhagat Singh International
MAA|Chennai|IN|Chennai International
CJB|Coimbatore|IN|Coimbatore International
DXN|Gautam Buddha Nagar|IN|Noida International
GAU|Guwahati|IN|Lokpriya Gopinath Bordoloi International
HWR|Halwara|IN|Halwara International
HSS|Hisar|IN|Maharaja Agrasen International
HYD|Hyderabad|IN|Rajiv Gandhi International
IMF|Imphal|IN|Bir Tikendrajit International
IDR|Indore|IN|Devi Ahilya Bai Holkar International
JAI|Jaipur|IN|Jaipur International
SAG|Kakadi|IN|Shirdi International
CNN|Kannur|IN|Kannur International
COK|Kochi|IN|Cochin International
CCU|Kolkata|IN|Netaji Subhash Chandra Bose International
LKO|Lucknow|IN|Chaudhary Charan Singh International
IXE|Mangaluru|IN|Mangaluru International
GOX|Mopa|IN|Manohar International
BOM|Mumbai|IN|Chhatrapati Shivaji Maharaj International
NAG|Nagpur|IN|Dr. Babasaheb Ambedkar International
ISK|Nashik|IN|Nashik International
NMI|Navi Mumbai|IN|Navi Mumbai International
DEL|New Delhi|IN|Indira Gandhi International
IXZ|Port Blair|IN|Veer Savarkar International Airport / INS Utkrosh
PNQ|Pune|IN|Pune International
HSR|Rajkot|IN|Rajkot International
IXB|Siliguri|IN|Bagdogra
SXR|Srinagar|IN|Srinagar International
STV|Surat|IN|Surat International
TRV|Thiruvananthapuram|IN|Thiruvananthapuram International
TRZ|Tiruchirappalli|IN|Tiruchirappalli International
TIR|Tirupati|IN|Tirupati International
BDQ|Vadodara|IN|Vadodara International
VNS|Varanasi|IN|Lal Bahadur Shastri International
GOI|Vasco da Gama|IN|Goa Dabolim International
VGA|Vijayawada|IN|Vijayawada International
VTZ|Visakhapatnam|IN|Alluri Sitarama Raju International Airport (Vizag)
EBL|Arbil|IQ|Erbil International
BGW|Baghdad|IQ|Baghdad International Airport / New Al Muthana Air Base
BSR|Basra|IQ|Basra International
KIK|Kirkuk|IQ|Kirkuk International
NJF|Najaf|IQ|Al Najaf International
ABD|Abadan|IR|Abadan Ayatollah Jami International
AWZ|Ahvaz|IR|Qasem Soleimani International
BND|Bandar Abbas|IR|Bandar Abbas International
XBJ|Birjand|IR|Birjand International
IFN|Isfahan|IR|Isfahan Shahid Beheshti International
PYK|Karaj|IR|Payam International
KER|Kerman|IR|Ayatollah Hashemi Rafsanjani International
KIH|Kish Island|IR|Kish International
MHD|Mashhad|IR|Mashhad International
GSM|Qeshm(Dayrestan)|IR|Qeshm International
SYZ|Shiraz|IR|Shiraz Shahid Dastghaib International
TBZ|Tabriz|IR|Tabriz International
IKA|Tehran|IR|Imam Khomeini International
THR|Tehran|IR|Mehrabad International
ZAH|Zahedan|IR|Zahedan International
AEY|Akureyri|IS|Akureyri International
KEF|Reykjavík|IS|Keflavik International
BRI|Bari|IT|Bari Karol Wojtyła International
BLQ|Bologna|IT|Bologna Guglielmo Marconi
BDS|Brindisi|IT|Brindisi
CAG|Cagliari|IT|Cagliari Elmas
VRN|Caselle (VR)|IT|Verona Villafranca Valerio Catullo
TRN|Caselle Torinese (TO)|IT|Turin
CTA|Catania|IT|Catania-Fontanarossa
MXP|Ferno (VA)|IT|Milan Malpensa International
FLR|Firenze (FI)|IT|Florence Airport, Peretola
GOA|Genova (GE)|IT|Genoa Cristoforo Colombo
SUF|Lamezia Terme (CZ)|IT|Lamezia Terme Sant'Eufemia International
NAP|Napoli|IT|Naples International
OLB|Olbia (SS)|IT|Olbia Costa Smeralda
BGY|Orio al Serio (BG)|IT|Il Caravaggio International
PMO|Palermo|IT|Falcone–Borsellino
PEG|Perugia (PG)|IT|Perugia San Francesco d'Assisi – Umbria International
PSR|Pescara|IT|Abruzzo
PSA|Pisa (PI)|IT|Pisa International
RMI|Rimini (RN)|IT|Federico Fellini International
CIA|Rome|IT|Ciampino–G. B. Pastine International
FCO|Rome|IT|Rome–Fiumicino Leonardo da Vinci International
TRS|Ronchi dei Legionari/Trieste|IT|Trieste
LIN|Segrate (MI)|IT|Milano Linate
TSF|Treviso (TV)|IT|Treviso
VCE|Venezia (VE)|IT|Venice Marco Polo
KIN|Kingston|JM|Norman Manley International
MBJ|Montego Bay|JM|Sangster International
AMM|Amman|JO|Queen Alia International
ADJ|Amman|JO|Marka International (Amman Civil)
AQJ|Aqaba|JO|King Hussein International
AOJ|Aomori|JP|Aomori
FUK|Fukuoka|JP|Fukuoka
HKD|Hakodate|JP|Hakodate
HIJ|Hiroshima|JP|Hiroshima
KOJ|Kagoshima|JP|Kagoshima
KMQ|Kanazawa|JP|Komatsu Airport / JASDF Komatsu Air Base
KKJ|Kitakyushu|JP|Kitakyushu
UKB|Kobe|JP|Kobe
KMJ|Kumamoto|JP|Kumamoto
FSZ|Makinohara / Shimada|JP|Mount Fuji Shizuoka
MYJ|Matsuyama|JP|Matsuyama
KMI|Miyazaki|JP|Miyazaki
NGS|Nagasaki|JP|Nagasaki
OKA|Naha|JP|Naha International
KCZ|Nankoku|JP|Kochi Ryoma
NRT|Narita|JP|Narita International
SDJ|Natori|JP|Sendai
KIJ|Niigata|JP|Niigata
OKJ|Okayama|JP|Okayama Momotaro
IBR|Omitama|JP|Ibaraki
KIX|Osaka|JP|Kansai International
ITM|Osaka|JP|Osaka Itami International
HSG|Saga|JP|Kyushu Saga International
CTS|Sapporo|JP|New Chitose
TAK|Takamatsu|JP|Takamatsu
NGO|Tokoname|JP|Chubu Centrair International
TKS|Tokushima|JP|Tokushima Awaodori Airport / JMSDF Tokushima Air Base
HND|Tokyo|JP|Tokyo Haneda International
EDL|Eldoret|KE|Eldoret International
KIS|Kisumu|KE|Kisumu International
MBA|Mombasa|KE|Moi International
NBO|Nairobi|KE|Jomo Kenyatta International
BSZ|Bishkek|KG|Manas International
OSS|Osh|KG|Osh International
IKU|Tamchy|KG|Issyk-Kul International
KTI|Phnom Penh (Boeng Khyang)|KH|Techo International
KOS|Preah Sihanouk|KH|Sihanouk International
SAI|Siem Reap|KH|Siem Reap-Angkor International
DSY|Ta Noun|KH|Dara Sakor International
CXI|Kiritimati|KI|Cassidy International
TRW|South Tarawa|KI|Bonriki International
SKB|Basseterre|KN|Robert L. Bradshaw International
FNJ|Pyongyang|KP|Pyongyang Sunan International
PUS|Busan|KR|Gimhae International
CJJ|Cheongju|KR|Cheongju International Airport/Cheongju Air Base (K-59/G-513)
TAE|Daegu|KR|Daegu International
YNY|Gonghang-ro|KR|Yangyang International
CJU|Jeju City|KR|Jeju International
MWX|Muan (Piseo-ri)|KR|Muan International
ICN|Seoul|KR|Incheon International
GMP|Seoul|KR|Seoul Gimpo International
KWI|Kuwait City|KW|Kuwait International
GCM|George Town|KY|Owen Roberts International
SCO|Aktau|KZ|Aktau International
AKX|Aktobe|KZ|Aktobe International
ALA|Almaty|KZ|Almaty International
NQZ|Astana|KZ|Nursultan Nazarbayev International
GUW|Atyrau|KZ|Atyrau International
BXY|Baikonur|KZ|Baikonur Krayniy International
KGF|Karaganda|KZ|Sary-Arka
KOV|Kokshetau|KZ|Kokshetau International
KSN|Kostanay|KZ|Kostanay International
KZO|Kyzylorda|KZ|Korkyt Ata International
PWQ|Pavlodar|KZ|Pavlodar International
PPK|Petropavl|KZ|Petropavl International
PLX|Semey|KZ|Semei International
CIT|Shymkent|KZ|Shymkent International
DMB|Taraz|KZ|Taraz International
HSA|Turkıstan|KZ|Hazrat Sultan International
URA|Uralsk|KZ|Manshuk Mametova International
UKK|Ust-Kamenogorsk (Oskemen)|KZ|Oskemen International
DZN|Zhezkazgan|KZ|Zhezkazgan National
LPQ|Luang Phabang|LA|Luang Phabang International
PKZ|Pakse|LA|Pakse International
VTE|Vientiane|LA|Wattay International
BEY|Beirut|LB|Beirut Rafic Hariri International
UVF|Vieux Fort|LC|Hewanorra International
CMB|Colombo|LK|Bandaranaike International Colombo
RML|Colombo|LK|Colombo Ratmalana International
JAF|Jaffna|LK|Jaffna International
ROB|Monrovia|LR|Roberts International
MSU|Maseru(Mazenod)|LS|Moshoeshoe I International
KUN|Kaunas|LT|Kaunas International
PLQ|Palanga|LT|Palanga International
VNO|Vilnius|LT|Vilnius International
LUX|Luxembourg|LU|Luxembourg-Findel International
RIX|Riga|LV|Riga International
LAQ|Al Albraq|LY|Al Abraq International
BEN|Benina|LY|Benina International
MJI|Tripoli|LY|Mitiga International
AGA|Agadir (Temsia)|MA|Al Massira
OUD|Ahl Angad|MA|Oujda Angads
NDR|Al Aaroui|MA|Nador Al Aaroui International
CMN|Casablanca|MA|Mohammed V International
RAK|Marrakesh|MA|Marrakesh Menara
OZZ|Ouarzazate|MA|Ouarzazate International
BEM|Oulad Yaich|MA|Beni Mellal
RBA|Rabat|MA|Rabat-Salé
FEZ|Saïss|MA|Fes Saïss International
TNG|Tangier|MA|Tangier Ibn Battuta
TTU|Tétouan|MA|Sania Ramel
OZG|Zagora|MA|Zagora
RMO|Chişinău|MD|Chişinău International
TGD|Podgorica|ME|Podgorica Airport / Podgorica Golubovci Airbase
TNR|Antananarivo|MG|Ivato International
MJN|Mahajanga|MG|Amborovy
NOS|Nosy Be|MG|Nosy Be International
TMM|Toamasina|MG|Toamasina Ambalamanasy
MAJ|Majuro Atoll|MH|Marshall Islands International
SKP|Ilinden|MK|Skopje International
OHD|Ohrid|MK|Ohrid St. Paul the Apostle
BKO|Bamako|ML|Modibo Keita International
TOM|Timbuktu|ML|Tombouktou
MDL|Mandalay|MM|Mandalay International
NYT|Naypyitaw|MM|Nay Pyi Taw International
RGN|Yangon|MM|Yangon International
UBN|Ulaanbaatar (Sergelen)|MN|Ulaanbaatar Chinggis Khaan International
MFM|Nossa Senhora do Carmo|MO|Macau International
ROP|Rota Island|MP|Rota International
FDF|Fort-de-France|MQ|Martinique Aimé Césaire International
NDB|Nouadhibou|MR|Nouadhibou International
NKC|Nouakchott|MR|Nouakchott–Oumtounsy International
MNI|Gerald's Park|MS|John A. Osborne
MLA|Valletta|MT|Malta International
MRU|Plaine Magnien|MU|Sir Seewoosagur Ramgoolam International
GAN|Gan|MV|Gan International
HAQ|Haa Dhaalu Atoll|MV|Hanimaadhoo International
MLE|Malé|MV|Velana International
BLZ|Blantyre|MW|Chileka International
LLW|Lumbadzi|MW|Kamuzu International
ACA|Acapulco|MX|General Juan N. Álvarez International
AGU|Aguascalientes|MX|Aguascalientes International
CUN|Cancún|MX|Cancún International
CUU|Chihuahua|MX|General Roberto Fierro Villalobos International
CJS|Ciudad Juárez|MX|Abraham González International
CZM|Cozumel|MX|Cozumel International
CUL|Culiacán|MX|Bachigualato Federal International
GDL|Guadalajara|MX|Guadalajara International
HMO|Hermosillo|MX|General Ignacio L. Pesqueira International
HUX|Huatulco|MX|Bahías de Huatulco International
ZIH|Ixtapa|MX|Ixtapa-Zihuatanejo International
LTO|Loreto|MX|Loreto International
MZT|Mazatlàn|MX|General Rafael Buelna International
MEX|Mexico City|MX|Mexico City Benito Juárez International
NLU|Mexico City|MX|Felipe Ángeles International
MTY|Monterrey|MX|Monterrey International
MLM|Morelia|MX|General Francisco J. Mujica International
MID|Mérida|MX|Manuel Crescencio Rejón International
OAX|Oaxaca|MX|Xoxocotlán International
PBC|Puebla|MX|Hermanos Serdán International
PVR|Puerto Vallarta|MX|Puerto Vallarta International
QRO|Querétaro|MX|Querétaro Intercontinental
SJD|San José del Cabo|MX|Los Cabos International
BJX|Silao|MX|Guanajuato International
TIJ|Tijuana|MX|General Abelardo L. Rodriguez International
TLC|Toluca|MX|Adolfo López Mateos International
TQO|Tulum|MX|Felipe Carrillo Puerto International Airport Tulum
VER|Veracruz|MX|General Heriberto Jara International
VSA|Villahermosa|MX|Carlos Rovirosa Pérez International
IPH|Ipoh|MY|Sultan Azlan Shah
JHB|Johor Bahru|MY|Senai International
BKI|Kota Kinabalu|MY|Kota Kinabalu International
KCH|Kuching|MY|Kuching International
LGK|Langkawi|MY|Langkawi International
PEN|Penang|MY|Penang International
KUL|Sepang|MY|Kuala Lumpur International
SZB|Subang|MY|Sultan Abdul Aziz Shah International
BEW|Beira|MZ|Beira International
MPM|Maputo|MZ|Maputo
APL|Nampula|MZ|Nampula
TET|Tete|MZ|Tete
WVB|Walvis Bay(Rooikop)|NA|Walvis Bay International
WDH|Windhoek|NA|Hosea Kutako International
NOU|Nouméa (La Tontouta)|NC|La Tontouta International
NIM|Niamey|NE|Diori Hamani International
ABV|Abuja|NG|Nnamdi Azikiwe International
ABB|Asaba|NG|Asaba International
BCU|Bauchi|NG|Sir Abubakar Tafawa Balewa Bauchi State International
ENU|Enegu|NG|Akanu Ibiam International
ILR|Ilorin/Ogbomosho|NG|General Tunde Idiagbon International
KAD|Kaduna|NG|Kaduna International
KAN|Kano|NG|Mallam Aminu Kano International
LOS|Lagos|NG|Murtala Muhammed International
MIU|Maiduguri|NG|Maiduguri International
PHC|Port Harcourt|NG|Port Harcourt International
SKO|Sokoto|NG|Sadiq Abubakar III International
MGA|Managua|NI|Augusto C. Sandino (Managua) International
AMS|Amsterdam|NL|Amsterdam Airport Schiphol
EIN|Eindhoven|NL|Eindhoven
GRQ|Groningen|NL|Groningen Airport Eelde
MST|Maastricht|NL|Maastricht Aachen
RTM|Rotterdam|NL|Rotterdam The Hague
BGO|Bergen|NO|Bergen Airport, Flesland
BOO|Bodø|NO|Bodø
EVE|Evenes|NO|Harstad/Narvik
KRS|Kristiansand(Kjevik)|NO|Kristiansand
OSL|Oslo (Gardermoen)|NO|Oslo-Gardermoen International
TRF|Sandefjord(Torp)|NO|Sandefjord Airport, Torp
SVG|Stavanger|NO|Stavanger Airport, Sola
TOS|Tromsø|NO|Tromsø
TRD|Trondheim|NO|Trondheim Airport, Værnes
AES|Ålesund|NO|Ålesund
KTM|Kathmandu|NP|Tribhuvan International
PHH|Pokhara|NP|Pokhara International
BWA|Siddharthanagar (Bhairahawa)|NP|Gautam Buddha International
AKL|Auckland|NZ|Auckland International
CHC|Christchurch|NZ|Christchurch International
ZQN|Queenstown|NZ|Queenstown
WLG|Wellington|NZ|Wellington International
DQM|Duqm|OM|Duqm International
MCT|Muscat/Seeb|OM|Muscat International
SLL|Salalah|OM|Salalah International
OHS|Suhar|OM|Suhar International
PTY|Tocumen|PA|Tocumen International
AQP|Arequipa|PE|Rodríguez Ballón International
CIX|Chiclayo|PE|Capitán FAP José A. Quiñones González International
CUZ|Cusco|PE|Alejandro Velasco Astete International
IQT|Iquitos|PE|Coronel FAP Francisco Secada Vignetta International
JUL|Juliaca|PE|Inca Manco Capac International
LIM|Lima|PE|Jorge Chávez International
PCL|Pucallpa|PE|Cap FAP David Abenzur Rengifo International
TRU|Trujillo|PE|Capitán FAP Carlos Martínez de Pinillos International
PPT|Papeete|PF|Fa'a'ā International
LAE|Lae|PG|Nadzab Tomodachi International
POM|Port Moresby|PG|Port Moresby Jacksons International
BCD|Bacolod City|PH|Bacolod-Silay International
ILO|Cabatuan|PH|Iloilo International
CEB|Cebu City/Lapu-Lapu City|PH|Mactan Cebu International
DVO|Davao|PH|Francisco Bangoy International
GES|General Santos|PH|General Santos International
KLO|Kalibo|PH|Kalibo International
CGY|Laguindingan|PH|Laguindingan International
LAO|Laoag City|PH|Laoag International
DRP|Legazpi|PH|Bicol International
CRK|Mabalacat|PH|Clark International Airport / Clark Air Base
MNL|Manila (Pasay)|PH|Ninoy Aquino International
SFS|Olongapo|PH|Subic Bay International Airport / Naval Air Station Cubi Point
TAG|Panglao|PH|Bohol-Panglao International
PPS|Puerto Princesa|PH|Puerto Princesa International Airport / PAF Antonio Bautista Air Base
ZAM|Zamboanga|PH|Zamboanga International
ISB|Attock|PK|Islamabad International
LYP|Faisalabad|PK|Faisalabad International
GWD|Gurandani|PK|New Gwadar International
KHI|Karachi|PK|Jinnah International
LHE|Lahore|PK|Allama Iqbal International
MUX|Multan|PK|Multan International
PEW|Peshawar|PK|Bacha Khan International
UET|Quetta|PK|Quetta International
SKT|Sialkot|PK|Sialkot International
KDU|Skardu|PK|Skardu International
TUK|Turbat|PK|Turbat International
KRK|Balice|PL|Kraków John Paul II International
GDN|Gdańsk|PL|Gdańsk Lech Wałęsa
RZE|Jasionka|PL|Rzeszów-Jasionka
KTW|Katowice|PL|Katowice Wojciech Korfanty International
LUZ|Lublin|PL|Lublin
WMI|Nowy Dwór Mazowiecki|PL|Warsaw Modlin
POZ|Poznań|PL|Poznań-Ławica
SZZ|Szczecin(Glewice)|PL|Solidarity Szczecin–Goleniów
WAW|Warsaw|PL|Warsaw Chopin
WRO|Wrocław|PL|Copernicus Wrocław
LCJ|Łódź|PL|Łódź Władysław Reymont
SJU|San Juan|PR|Luis Munoz Marin International
FAO|Faro|PT|Faro - Gago Coutinho International
FNC|Funchal|PT|Cristiano Ronaldo International
LIS|Lisbon|PT|Lisbon Humberto Delgado
PDL|Ponta Delgada|PT|João Paulo II
OPO|Porto|PT|Francisco de Sá Carneiro
ROR|Babelthuap Island|PW|Roman Tmetuchl International
ASU|Asunción|PY|Silvio Pettirossi International
AGT|Ciudad del Este|PY|Guaraní International
ENO|Encarnación|PY|Teniente Ramon A. Ayub Gonzalez International
DIA|Doha|QA|Doha International
DOH|Doha|QA|Hamad International
ZSE|Saint-Pierre|RE|Saint-Pierre Pierrefonds
RUN|Sainte-Marie|RE|Roland Garros
BCM|Bacău|RO|Bacău George Enescu International
GHV|Brașov (Ghimbav)|RO|Brașov-Ghimbav International
BBU|Bucharest|RO|Bucharest Băneasa Aurel Vlaicu International
CLJ|Cluj-Napoca|RO|Avram Iancu Cluj International
CND|Constanța|RO|Mihail Kogălniceanu International
CRA|Craiova|RO|Craiova International
IAS|Iaşi|RO|Iaşi International
OMR|Oradea|RO|Oradea International
OTP|Otopeni|RO|Bucharest Henri Coandă International
SBZ|Sibiu|RO|Sibiu International
SCV|Suceava|RO|Suceava Ștefan cel Mare International
TSR|Timişoara|RO|Timișoara Traian Vuia International
BEG|Belgrade|RS|Belgrade Nikola Tesla
INI|Niš|RS|Niš Constantine the Great
ABA|Abakan|RU|Abakan International
VVO|Artyom|RU|Vladivostok International
ASF|Astrakhan|RU|Astrakhan Narimanovo Boris M. Kustodiev International
BAX|Barnaul|RU|Barnaul Gherman Titov International
CEK|Chelyabinsk|RU|Kurchatov Chelyabinsk International
HTA|Chita|RU|Chita-Kadala International
GRV|Grozny|RU|Akhmat Kadyrov Grozny International
IKT|Irkutsk|RU|Irkutsk International
KGD|Kaliningrad|RU|Khrabrovo
KZN|Kazan|RU|Kazan International
KEJ|Kemerovo|RU|Alexei Leonov Kemerovo International
KRR|Krasnodar|RU|Krasnodar Pashkovsky International
KJA|Krasnoyarsk|RU|Krasnoyarsk International
MQF|Magnitogorsk|RU|Magnitogorsk International
MCX|Makhachkala|RU|Makhachkala Uytash International
MRV|Mineralnyye Vody|RU|Mineralnye Vody
ZIA|Moscow|RU|Zhukovsky International
DME|Moscow|RU|Domodedovo International
SVO|Moscow|RU|Sheremetyevo International
VKO|Moscow|RU|Vnukovo International
MMK|Murmansk|RU|Emperor Nicholas II Murmansk
NJC|Nizhnevartovsk|RU|Nizhnevartovsk
GOJ|Nizhny Novgorod|RU|Nizhny Novgorod / Strigino International
NSK|Norilsk|RU|Alykel International
OVB|Novosibirsk|RU|Novosibirsk Tolmachevo
OMS|Omsk|RU|Omsk Central
PEE|Perm|RU|Perm International
PKC|Petropavlovsk-Kamchatsky|RU|Yelizovo
KUF|Samara|RU|Kurumoch International
SKX|Saransk|RU|Saransk International
GSV|Saratov|RU|Gagarin International
AER|Sochi|RU|Sochi International
LED|St. Petersburg|RU|Pulkovo
SGC|Surgut|RU|Surgut International
TOF|Tomsk|RU|Tomsk Kamov
IAR|Tunoshna|RU|Golden Ring Yaroslavl International
TJM|Tyumen|RU|Roshchino International
UFA|Ufa|RU|Ufa International
UUD|Ulan Ude|RU|Baikal International
VOG|Volgograd|RU|Volgograd International
YKS|Yakutsk|RU|Platon Oyunsky Yakutsk International
SVX|Yekaterinburg|RU|Koltsovo
UUS|Yuzhno-Sakhalinsk|RU|Yuzhno-Sakhalinsk International
KGL|Kigali|RW|Kigali International
AHB|Abha|SA|Abha International
DMM|Ad Dammam|SA|King Fahd International
AJF|Al-Jawf|SA|Al-Jawf International
ULH|Al-Ula|SA|Al-Ula International
HAS|Hail|SA|Hail International
RSI|Hanak|SA|Red Sea International
HOF|Hofuf|SA|Al-Ahsa International
JED|Jeddah|SA|King Abdulaziz International
MED|Medina|SA|Prince Mohammad Bin Abdulaziz
AQI|Qaisumah|SA|Qaisumah–Hafar Al-Batin International
ELQ|Qassim|SA|Prince Naif bin Abdulaziz International
RUH|Riyadh|SA|King Khalid International
NUM|Sharma|SA|Neom Bay
TUU|Tabuk|SA|Prince Sultan bin Abdulaziz International
TIF|Taif|SA|Taif International
YNB|Yanbu|SA|Prince Abdulmohsen Bin Abdulaziz International
HIR|Honiara|SB|Honiara International
SEZ|Victoria|SC|Seychelles International
KRT|Khartoum|SD|Khartoum International
PZU|Port Sudan|SD|Port Sudan New International
GOT|Göteborg|SE|Göteborg Landvetter
KRN|Kiruna|SE|Kiruna
LPI|Linköping|SE|Linköping City
LLA|Luleå|SE|Luleå
MMX|Malmö|SE|Malmö Sturup
SCR|Malung-Sälen|SE|Scandinavian Mountains
NYO|Nyköping|SE|Stockholm Skavsta
ARN|Stockholm|SE|Stockholm-Arlanda
VST|Stockholm / Västerås|SE|Stockholm Västerås
UME|Umeå|SE|Umeå
VBY|Visby|SE|Visby
SIN|Singapore|SG|Singapore Changi
LJU|Zgornji Brnik|SI|Ljubljana Jože Pučnik
BTS|Bratislava|SK|M. R. Štefánik
FNA|Freetown (Lungi-Town)|SL|Lungi International
DSS|Dakar|SN|Blaise Diagne International
BSA|Bosaso|SO|Bender Qassim International
HGA|Hargeisa|SO|Egal International
MGQ|Mogadishu|SO|Aden Adde International
PBM|Paramaribo|SR|Johan Adolf Pengel International
JUB|Juba|SS|Juba International
TMS|São Tomé|ST|São Tomé International
SAL|San Salvador (San Luis Talpa)|SV|El Salvador International Airport Saint Óscar Arnulfo Romero y Galdámez
SXM|Sint Maarten|SX|Princess Juliana International
ALP|Aleppo|SY|Aleppo International
DAM|Damascus|SY|Damascus International
SHO|Mpaka|SZ|King Mswati III International
PLS|Providenciales|TC|Providenciales International
NDJ|N'Djamena|TD|N'Djamena International
LFW|Lomé|TG|Lomé–Tokoin International
DMK|Bangkok|TH|Don Mueang International
BKK|Bangkok|TH|Suvarnabhumi
CNX|Chiang Mai|TH|Chiang Mai International
CEI|Chiang Rai|TH|Mae Fah Luang - Chiang Rai International
HDY|Hat Yai|TH|Hat Yai International
KBV|Krabi|TH|Krabi International
USM|Na Thon (Ko Samui Island)|TH|Samui International
HKT|Phuket|TH|Phuket International
UTP|Rayong|TH|U-Tapao–Rayong–Pattaya International
UTH|Udon Thani|TH|Udon Thani International
KQT|Bokhtar|TJ|Bokhtar International
DYU|Dushanbe|TJ|Dushanbe International
LBD|Khujand|TJ|Khujand International
TJU|Kulob|TJ|Kulob International
DIL|Dili|TL|Presidente Nicolau Lobato International
OEC|Oecussi-Ambeno|TL|Oecusse Route of the Sandalwood International
ASB|Ashgabat|TM|Ashgabat International
TAZ|Daşoguz|TM|Dashoguz International
CRZ|Türkmenabat|TM|Türkmenabat International
DJE|Mellita|TN|Djerba Zarzis International
TUN|Tunis|TN|Tunis Carthage International
TBU|Nuku'alofa|TO|Fua'amotu International
VAV|Vava'u Island|TO|Vava'u International
ESB|Ankara|TR|Esenboğa International
AYT|Antalya|TR|Antalya International
BJV|Bodrum|TR|Milas Bodrum International
DLM|Dalaman|TR|Dalaman International
EDO|Edremit|TR|Balıkesir Koca Seyit
AOE|Eskişehir|TR|Hasan Polatkan
GZT|Gaziantep|TR|Gaziantep Oğuzeli International
ADB|Gaziemir|TR|Adnan Menderes International
IST|Istanbul|TR|İstanbul
ASR|Kayseri|TR|Kayseri Erkilet International
KYA|Konya|TR|Konya
NAV|Nevşehir|TR|Nevşehir Kapadokya
SAW|Pendik, Istanbul|TR|Istanbul Sabiha Gökçen International
COV|Tarsus|TR|Çukurova International
GNY|Şanlıurfa|TR|Şanlıurfa GAP
POS|Port of Spain|TT|Piarco International
TAB|Scarborough|TT|A.N.R. Robinson International
HUN|Hualien City|TW|Hualien Chiashan
MZG|Huxi|TW|Penghu Magong
KHH|Kaohsiung (Xiaogang)|TW|Kaohsiung International
RMQ|Taichung (Qingshui)|TW|Taichung International Airport / Ching Chuang Kang Air Base
TNN|Tainan (Rende)|TW|Tainan International Airport / Tainan Air Base
TSA|Taipei (Songshan)|TW|Taipei Songshan International
TPE|Taoyuan|TW|Taiwan Taoyuan International
JRO|Arusha|TZ|Kilimanjaro International
DAR|Dar es Salaam|TZ|Julius Nyerere International
MWZ|Mwanza|TZ|Mwanza International
ZNZ|Zanzibar|TZ|Abeid Amani Karume International
EBB|Entebbe|UG|Entebbe International
ALB|Albany|US|Albany International
ABQ|Albuquerque|US|Albuquerque International Sunport
ANC|Anchorage|US|Ted Stevens Anchorage International
ATL|Atlanta|US|Hartsfield Jackson Atlanta International
AUS|Austin|US|Austin Bergstrom International
BWI|Baltimore|US|Baltimore/Washington International Thurgood Marshall
BHM|Birmingham|US|Birmingham-Shuttlesworth International
BOI|Boise|US|Boise Air Terminal/Gowen Field
BOS|Boston|US|Boston Logan International
BUF|Buffalo|US|Buffalo Niagara International
BUR|Burbank|US|Hollywood Burbank/Bob Hope
CHS|Charleston|US|Charleston International
CLT|Charlotte|US|Charlotte Douglas International
MDW|Chicago|US|Chicago Midway International
ORD|Chicago|US|Chicago O'Hare International
CVG|Cincinnati / Covington|US|Cincinnati Northern Kentucky International
CLE|Cleveland|US|Cleveland Hopkins International
COS|Colorado Springs|US|City of Colorado Springs Municipal
CMH|Columbus|US|John Glenn Columbus International
DAL|Dallas|US|Dallas Love Field
DFW|Dallas-Fort Worth|US|Dallas Fort Worth International
DEN|Denver|US|Denver International
DSM|Des Moines|US|Des Moines International
DTW|Detroit|US|Detroit Metropolitan Wayne County
IAD|Dulles|US|Washington Dulles International
ELP|El Paso|US|El Paso International
FLL|Fort Lauderdale|US|Fort Lauderdale Hollywood International
RSW|Fort Myers|US|Southwest Florida International
FAT|Fresno|US|Fresno Yosemite International
GRR|Grand Rapids|US|Gerald R. Ford International
GSO|Greensboro|US|Piedmont Triad International
BDL|Hartford|US|Bradley International
HNL|Honolulu, Oahu|US|Daniel K. Inouye International
HOU|Houston|US|William P. Hobby
IAH|Houston|US|George Bush Intercontinental
IND|Indianapolis|US|Indianapolis International
JAX|Jacksonville|US|Jacksonville International
OGG|Kahului|US|Kahului International
KOA|Kailua-Kona|US|Ellison Onizuka Kona International Airport at Keāhole
MCI|Kansas City|US|Kansas City International
TYS|Knoxville/Maryville|US|McGhee Tyson
LAS|Las Vegas|US|Harry Reid International
LIH|Lihue, Kauai|US|Lihue
LGB|Long Beach|US|Long Beach International
LAX|Los Angeles|US|Los Angeles International
SDF|Louisville|US|Louisville Muhammad Ali International
MEM|Memphis|US|Frederick W. Smith International
MIA|Miami|US|Miami International
MKE|Milwaukee|US|General Mitchell International
MSP|Minneapolis|US|Minneapolis–Saint Paul International Airport / Wold–Chamberlain Field
MYR|Myrtle Beach|US|Myrtle Beach International
BNA|Nashville|US|Nashville International
MSY|New Orleans|US|Louis Armstrong New Orleans International
JFK|New York|US|John F. Kennedy International
LGA|New York|US|LaGuardia
EWR|Newark|US|Newark Liberty International
ORF|Norfolk|US|Norfolk International
OAK|Oakland|US|Oakland San Francisco Bay
OKC|Oklahoma City|US|OKC Will Rogers World
OMA|Omaha|US|Eppley
ONT|Ontario|US|Ontario International
MCO|Orlando|US|Orlando International
SFB|Orlando|US|Orlando Sanford International
PSP|Palm Springs|US|Palm Springs International
PNS|Pensacola|US|Pensacola International
PHL|Philadelphia|US|Philadelphia International
PHX|Phoenix|US|Phoenix Sky Harbor International
PIE|Pinellas Park|US|St. Petersburg Clearwater International
PIT|Pittsburgh|US|Pittsburgh International
PDX|Portland|US|Portland International
PWM|Portland|US|Portland International Jetport
PVD|Providence/Warwick|US|Rhode Island T. F. Green International
RDU|Raleigh/Durham|US|Raleigh-Durham International
RNO|Reno|US|Reno Tahoe International
RIC|Richmond|US|Richmond International
ROC|Rochester|US|Frederick Douglass Greater Rochester International
SMF|Sacramento|US|Sacramento International
SLC|Salt Lake City|US|Salt Lake City International
SAT|San Antonio|US|San Antonio International
SBD|San Bernardino|US|San Bernardino International
SAN|San Diego|US|San Diego International
SFO|San Francisco|US|San Francisco International
SJC|San Jose|US|Mineta San Jose International
SNA|Santa Ana|US|John Wayne Orange County International
SRQ|Sarasota/Bradenton|US|Sarasota Bradenton International
SAV|Savannah|US|Savannah Hilton Head International
SEA|Seattle|US|Seattle–Tacoma International
GEG|Spokane|US|Spokane International
STL|St Louis|US|St. Louis Lambert International
SYR|Syracuse|US|Syracuse Hancock International
TPA|Tampa|US|Tampa International
TUS|Tucson|US|Tucson International
TUL|Tulsa|US|Tulsa International
DCA|Washington|US|Ronald Reagan Washington National
DJT|West Palm Beach|US|President Donald J. Trump International
MVD|Ciudad de la Costa|UY|Carrasco General Cesáreo L. Berisso International
BHK|Bukhara|UZ|Bukhara International
NMA|Namangan|UZ|Namangan International
NCU|Nukus|UZ|Nukus International
SKD|Samarkand|UZ|Samarkand International
TAS|Tashkent|UZ|Tashkent International
UGC|Urgench|UZ|Urgench International
SVD|Kingstown|VC|Argyle International
BLA|Barcelona|VE|General José Antonio Anzoategui International
BRM|Barquisimeto|VE|Jacinto Lara International
PZO|Guyana City|VE|General Manuel Carlos Piar International
PMV|Isla Margarita|VE|Del Caribe Santiago Mariño International
CCS|Maiquetía|VE|Maiquetía Simón Bolívar International
MAR|Maracaibo|VE|La Chinita International
VLN|Valencia|VE|Arturo Michelena International
EIS|Beef Island|VG|Terrance B. Lettsome International
STT|Charlotte Amalie|VI|Cyril E. King
VCA|Can Tho|VN|Can Tho International
DAD|Da Nang|VN|Da Nang International
HPH|Haiphong (Hai An)|VN|Cat Bi International
HAN|Hanoi (Soc Son)|VN|Noi Bai International
SGN|Ho Chi Minh City|VN|Tan Son Nhat International
HUI|Huế|VN|Phu Bai International
CXR|Nha Trang/nha Trang aiurportCam Ranh|VN|Cam Ranh International Airport / Cam Ranh Air Base
PQC|Phu Quoc Island|VN|Phú Quốc International
VLI|Port Vila|VU|Bauerfield International
WLS|Wallis Island|WF|Hihifo
APW|Apia|WS|Faleolo International
PRN|Prishtina|XK|Priština Adem Jashari International
ADE|Aden|YE|Aden International
RIY|Mukalla(Riyan)|YE|Riyan International
SAH|Sanaa|YE|Sanaa International
GXF|Seiyun|YE|Seiyun Hadhramaut International
DZA|Dzaoudzi|YT|Dzaoudzi Pamandzi International
BFN|Bloemfontein|ZA|Bram Fischer International
CPT|Cape Town|ZA|Cape Town International
DUR|Durban|ZA|King Shaka International
ELS|East London|ZA|King Phalo
GRJ|George|ZA|George
PLZ|Gqeberha (Port Elizabeth)|ZA|Chief Dawid Stuurman International
HLA|Johannesburg|ZA|Lanseria International
JNB|Johannesburg|ZA|O.R. Tambo International
KIM|Kimberley|ZA|Kimberley
MQP|Mbombela|ZA|Kruger Mpumalanga International
PTG|Polokwane|ZA|Polokwane International
LVI|Livingstone|ZM|Harry Mwanga Nkumbula International
LUN|Lusaka|ZM|Kenneth Kaunda International
MFU|Mfuwe|ZM|Mfuwe International
NLA|Ndola|ZM|Simon Mwansa Kapwepwe International
BUQ|Bulawayo|ZW|Joshua Mqabuko Nkomo International
HRE|Harare|ZW|Robert Gabriel Mugabe International
VFA|Victoria Falls|ZW|Victoria Falls International
KHT|Khost|AF|Khost International
BBQ|Codrington|AG|Burton-Nibbs International
AXA|The Valley|AI|Clayton J. Lloyd International
CAB|Cabinda|AO|Cabinda
CBT|Catumbela|AO|Catumbela
DUE|Chitato|AO|Dundo
NOV|Huambo|AO|Albano Machado
SDD|Lubango|AO|Lubango Mukanka International
MEG|Malanje|AO|Malanje
SSY|Mbanza Congo|AO|Mbanza Congo
SPP|Menongue|AO|Menongue
MSZ|Moçâmedes|AO|Welwitschia Mirabilis International
GXG|Negage|AO|Negage
VPE|Ngiva|AO|Ngjiva Pereira
SZA|Soyo|AO|Soyo
BHI|Bahía Blanca|AR|Comandante Espora
CTC|Catamarca|AR|Coronel Felipe Varela International
CPC|Chapelco/San Martin de los Andes|AR|Aviador C. Campos
CNQ|Corrientes|AR|Corrientes
FTE|El Calafate|AR|El Calafate - Commander Armando Tola International
EQS|Esquel|AR|Esquel Brigadier Antonio Parodi International
FMA|Formosa|AR|Formosa National
IRJ|La Rioja|AR|Capitan V A Almonacid
LHS|Las Heras|AR|Las Heras
MDQ|Mar del Plata|AR|Ástor Piazzola International
NEC|Necochea|AR|Necochea
PRA|Parana|AR|General Urquiza
PMQ|Perito Moreno|AR|Perito Moreno Jalil Hamer
PSS|Posadas|AR|Libertador Gral D Jose De San Martin
PUD|Puerto Deseado|AR|Puerto Deseado
IGR|Puerto Iguazu|AR|Cataratas Del Iguazú International
PMY|Puerto Madryn|AR|El Tehuelche
REL|Rawson|AR|Almirante Marco Andres Zar
RGA|Rio Grande|AR|Gobernador Ramón Trejo Noel International
UAQ|San Juan|AR|Domingo Faustino Sarmiento
LUQ|San Luis|AR|Brigadier Mayor D Cesar Raul Ojeda
AFA|San Rafael|AR|Suboficial Ay Santiago Germano
SFN|Santa Fe|AR|Sauce Viejo
RSA|Santa Rosa|AR|Santa Rosa
SST|Santa Teresita|AR|Santa Teresita
SDE|Santiago del Estero|AR|Vicecomodoro Angel D. La Paz Aragonés
RHD|Termas de Río Hondo|AR|Termas de Río Hondo international
USH|Ushuaia|AR|Ushuaia - Malvinas Argentinas International
VDM|Viedma / Carmen de Patagones|AR|Gobernador Castello
ALH|Albany|AU|Albany
ASP|Alice Springs|AU|Alice Springs
ARM|Armidale|AU|Armidale
BNK|Ballina|AU|Ballina Byron Gateway
BCI|Barcaldine|AU|Barcaldine
BHS|Bathurst|AU|Bathurst
BEU|Bedourie|AU|Bedourie
THG|Biloela|AU|Thangool
BVI|Birdsville|AU|Birdsville
BKQ|Blackall|AU|Blackall
BQL|Boulia|AU|Boulia
BRK|Bourke|AU|Bourke
KGI|Broadwood|AU|Kalgoorlie Boulder
BHQ|Broken Hill|AU|Broken Hill
BDB|Bundaberg|AU|Bundaberg
BWT|Burnie|AU|Wynyard
CBR|Canberra|AU|Canberra
CVQ|Carnarvon|AU|Carnarvon
CED|Ceduna|AU|Ceduna
CTL|Charleville|AU|Charleville
CNJ|Cloncurry|AU|Cloncurry
CAZ|Cobar|AU|Cobar
CUQ|Coen|AU|Coen
CFS|Coffs Harbour|AU|Coffs Harbour
CPD|Coober Pedy|AU|Coober Pedy
CTN|Cooktown|AU|Cooktown
OOM|Cooma|AU|Cooma Snowy Mountains
CNB|Coonamble|AU|Coonamble
CMA|Cunnamulla|AU|Cunnamulla
MJK|Denham|AU|Shark Bay
DPO|Devonport|AU|Devonport
DBO|Dubbo|AU|Dubbo City Regional
ABX|East Albury|AU|Albury
ELC|Elcho Island|AU|Elcho Island
EMD|Emerald|AU|Emerald
EPR|Esperance|AU|Esperance
MEB|Essendon Fields|AU|Melbourne Essendon
LEA|Exmouth|AU|Learmonth
FIZ|Fitzroy Crossing|AU|Fitzroy Crossing
WGA|Forest Hill|AU|Wagga Wagga
GLT|Gladstone|AU|Gladstone
GFF|Griffith|AU|Griffith
GTE|Groote Eylandt|AU|Groote Eylandt
HTI|Hamilton Island|AU|Hamilton Island
HVB|Hervey Bay|AU|Hervey Bay
HID|Horn|AU|Horn Island
KTA|Karratha|AU|Karratha
KNS|King Island|AU|King Island
KGC|Kingscote|AU|Kingscote
KWM|Kowanyama|AU|Kowanyama
KNX|Kununurra|AU|East Kimberley Regional (Kununurra)
LST|Launceston (Western Junction)|AU|Launceston
LER|Leinster|AU|Leinster
LNO|Leonora|AU|Leonora
LHG|Lightning Ridge|AU|Lightning Ridge
LSY|Lismore|AU|Lismore
IRG|Lockhart River|AU|Lockhart River
LRE|Longreach|AU|Longreach
MKY|Mackay|AU|Mackay
MNG|Maningrida|AU|Maningrida
MKR|Meekatharra|AU|Meekatharra
MBW|Melbourne|AU|Melbourne Moorabbin
MIM|Merimbula|AU|Merimbula
MQL|Mildura|AU|Mildura
SNB|Milikapiti|AU|Snake Bay
GET|Moonyoonooka|AU|Geraldton
MOV|Moranbah|AU|Moranbah
MRZ|Moree|AU|Moree
MYA|Moruya|AU|Moruya
MGB|Mount Gambier|AU|Mount Gambier
MHU|Mount Hotham|AU|Mount Hotham
ISA|Mount Isa|AU|Mount Isa
MMG|Mount Magnet|AU|Mount Magnet
NAA|Narrabri|AU|Narrabri
NRA|Narrandera|AU|Narrandera
ZNE|Newman|AU|Newman
GOV|Nhulunbuy|AU|Gove
NTN|Normanton|AU|Normanton
OKY|Oakey Army Aviation Centre|AU|Oakey Army Aviation Centre
PBO|Paraburdoo|AU|Paraburdoo
PKE|Parkes|AU|Parkes
PUG|Port Augusta|AU|Port Augusta
PLO|Port Lincoln|AU|Port Lincoln
PQQ|Port Macquarie|AU|Port Macquarie
PTJ|Portland|AU|Portland
PPP|Proserpine|AU|Proserpine Whitsunday Coast
ULP|Quilpie|AU|Quilpie
ROK|Rockhampton|AU|Rockhampton
RMA|Roma|AU|Roma
TMW|Tamworth|AU|Tamworth
TCA|Tennant Creek|AU|Tennant Creek
XTG|Thargomindah|AU|Thargomindah
TSV|Townsville|AU|Townsville Airport / RAAF Base Townsville
WGE|Walgett|AU|Walgett
WEI|Weipa|AU|Weipa
WYA|Whyalla|AU|Whyalla
WUN|Wiluna|AU|Wiluna
WNR|Windorah|AU|Windorah
WIN|Winton|AU|Winton
AYQ|Yulara|AU|Ayers Rock Connellan
GBB|Gabala|AZ|Gabala International
LHL|Lachin|AZ|Lachin International
BZL|Barisal|BD|Barisal
CXB|Cox's Bazar|BD|Cox's Bazar
JSR|Jashore (Jessore)|BD|Jessore
RJH|Rajshahi|BD|Shah Makhdum
SPD|Saidpur|BD|Saidpur
ANR|Antwerp|BE|Antwerp International Airport (Deurne)
LGG|Grâce-Hollogne|BE|Liège
GID|Gitega|BI|Gitega
SBH|Gustavia|BL|St. Jean
CIJ|Cobija|BO|Capitán Aníbal Arab
GYA|Guayaramerín|BO|Guayaramerín
PSZ|Puerto Suárez|BO|Capitán Av. Salvador Ogaya G. airport
RIB|Riberalta|BO|Capitán Av. Selin Zeitun Lopez
SRZ|Santa Cruz|BO|El Trompillo
TJA|Tarija|BO|Capitan Oriel Lea Plaza
TDD|Trinidad|BO|Teniente Av. Jorge Henrich Arauz
EUX|Oranjestad|BQ|F. D. Roosevelt
SAB|Zion's Hill|BQ|Juancho E. Yrausquin
AFL|Alta Floresta|BR|Piloto Osvaldo Marques Dias
ATM|Altamira|BR|Altamira Interstate
AJU|Aracaju|BR|Aracaju - Santa Maria
AUX|Araguaína|BR|Araguaína
AQA|Araraquara|BR|Araraquara
AAX|Araxá|BR|Romeu Zema
ARU|Araçatuba|BR|Araçatuba
JTC|Bauru|BR|Bauru/Arealva–Moussa Nakhal Tobias State
CPV|Campina Grande|BR|Presidente João Suassuna
CGR|Campo Grande|BR|Campo Grande
CAW|Campos dos Goytacazes|BR|Bartolomeu Lisandro
CAC|Cascavel|BR|Coronel Adalberto Mendes da Silva
CXJ|Caxias Do Sul|BR|Hugo Cantergiani Regional
XAP|Chapecó|BR|Serafin Enoss Bertaso
CMG|Corumbá|BR|Corumbá International
JJD|Cruz|BR|Comandante Ariston Pessoa
CZS|Cruzeiro Do Sul|BR|Cruzeiro do Sul
FEN|Fernando de Noronha|BR|Fernando de Noronha
GVR|Governador Valadares|BR|Coronel Altino Machado
IOS|Ilhéus|BR|Bahia - Jorge Amado
IMP|Imperatriz|BR|Prefeito Renato Moreira
IPN|Ipatinga|BR|Usiminas
ITB|Itaituba|BR|Itaituba
JOI|Joinville|BR|Lauro Carneiro de Loyola
JDF|Juiz de Fora|BR|Francisco de Assis
IZA|Juiz de Fora|BR|Presidente Itamar Franco
LAJ|Lages|BR|Lages
LDB|Londrina|BR|Governor José Richa
MCP|Macapá|BR|Macapá - Alberto Alcolumbre International
MNX|Manicoré|BR|Manicoré
MAB|Marabá|BR|João Correa da Rocha
MGF|Maringá|BR|Regional de Maringá - Sílvio Name Júnior
MII|Marília|BR|Frank Miloye Milenkowichi–Marília State
MOC|Montes Claros|BR|Mário Ribeiro
MVF|Mossoró|BR|Dix-Sept Rosado
TMT|Oriximiná|BR|Trombetas
PMW|Palmas|BR|Brigadeiro Lysias Rodrigues
CKS|Parauapebas|BR|Carajás
PHB|Parnaíba|BR|Parnaíba - Prefeito Doutor João Silva Filho International
PFB|Passo Fundo|BR|Lauro Kurtz
PAV|Paulo Afonso|BR|Paulo Afonso
PET|Pelotas|BR|João Simões Lopes Neto International
PNZ|Petrolina|BR|Senador Nilo Coelho
PGZ|Ponta Grossa|BR|Ponta Grossa Airport - Comandante Antonio Amilton Beraldo
PMG|Ponta Porã|BR|Ponta Porã
PPB|Presidente Prudente|BR|Presidente Prudente
RAO|Ribeirão Preto|BR|Leite Lopes
ROO|Rondonópolis|BR|Maestro Marinho Franco
RIA|Santa Maria|BR|Santa Maria
STM|Santarém|BR|Santarém - Maestro Wilson Fonseca International
GEL|Santo Ângelo|BR|Santo Ângelo
SJL|São Gabriel da Cachoeira|BR|São Gabriel da Cachoeira
SJK|São José Dos Campos|BR|Professor Urbano Ernesto Stumpf
SJP|São José do Rio Preto|BR|Prof. Eribelto Manoel Reino State
TBT|Tabatinga|BR|Tabatinga International
TFF|Tefé|BR|Tefé
THE|Teresina|BR|Senador Petrônio Portela
TUR|Tucuruí|BR|Tucuruí
UBA|Uberaba|BR|Mário de Almeida Franco
UDI|Uberlândia|BR|Ten. Cel. Aviador César Bombonato
URG|Uruguaiana|BR|Rubem Berta
BVH|Vilhena|BR|Brigadeiro Camarão
VDC|Vitória da Conquista|BR|Glauber de Andrade Rocha
MYG|Abraham Bay Settlement|BS|Mayaguana
TZN|Andros|BS|Congo Town
SAQ|Andros Island|BS|San Andros
ASD|Andros Town|BS|Andros Town
ATC|Arthur's Town|BS|Arthur's Town
TBI|Cat Island|BS|New Bight
CCZ|Chub Cay|BS|Chub Cay
CRI|Colonel Hill|BS|Colonel Hill
LGI|Deadman's Cay|BS|Deadman's Cay
GHB|Governor's Harbour|BS|Governor's Harbour
MHH|Marsh Harbour|BS|Leonard M. Thompson International
IGA|Matthew Town|BS|Inagua
GGT|Moss Town|BS|Exuma International
ELH|North Eleuthera|BS|North Eleuthera
RSD|Rock Sound|BS|Rock Sound International
BIM|South Bimini|BS|South Bimini
AXP|Spring Point|BS|Spring Point
SML|Stella Maris|BS|Stella Maris
TCB|Treasure Cay|BS|Treasure Cay
GME|Gomel|BY|Gomel
MVQ|Mogilev|BY|Mogilev
TZA|Belize City|BZ|Sir Barry Bowen Municipal
CUK|Caye Caulker|BZ|Caye Caulker
CYC|Caye Chapel|BZ|Caye Chapel
CZH|Corozal|BZ|Corozal
DGA|Dangriga|BZ|Dangriga
PLJ|Placencia|BZ|Placencia
SPR|San Pedro|BZ|John Greif II
YXX|Abbotsford|CA|Abbotsford International
YAA|Anahim Lake|CA|Anahim Lake
YBC|Baie-Comeau|CA|Baie-Comeau
YBK|Baker Lake|CA|Baker Lake
YLK|Barrie|CA|Barrie-Lake Simcoe Regional
ZEL|Bella Bella|CA|Bella Bella (Campbell Island)
QBC|Bella Coola|CA|Bella Coola
YBX|Blanc-Sablon|CA|Lourdes-de-Blanc-Sablon
YVB|Bonaventure|CA|Bonaventure
YBY|Bonnyville|CA|Bonnyville
YBR|Brandon|CA|Brandon Municipal
YKF|Breslau|CA|Region of Waterloo International
YPZ|Burns Lake|CA|Burns Lake
YCB|Cambridge Bay|CA|Cambridge Bay
YBL|Campbell River|CA|Campbell River
YCG|Castlegar|CA|Castlegar/West Kootenay Regional
YYG|Charlottetown|CA|Charlottetown
YMT|Chibougamau|CA|Chapais
YYQ|Churchill|CA|Churchill
YQQ|Comox|CA|Comox Valley International Airport / CFB Comox
YZS|Coral Harbour|CA|Coral Harbour
YXC|Cranbrook|CA|Cranbrook/Canadian Rockies International
YDN|Dauphin|CA|Dauphin Barker
YDA|Dawson City|CA|Dawson City
YDF|Deer Lake|CA|Deer Lake
YPY|Fort Chipewyan|CA|Fort Chipewyan
YAG|Fort Frances|CA|Fort Frances Municipal
YMM|Fort McMurray|CA|Fort McMurray International
YYE|Fort Nelson|CA|Fort Nelson
YXJ|Fort Saint John|CA|Fort St John / North Peace Regional
YFS|Fort Simpson|CA|Fort Simpson
YSM|Fort Smith|CA|Fort Smith
YFC|Fredericton|CA|Fredericton International
YQX|Gander|CA|Gander International
YGP|Gaspé|CA|Michel-Pouliot Gaspé
YND|Gatineau|CA|Ottawa / Gatineau
YYR|Goose Bay|CA|Goose Bay
YQU|Grande Prairie|CA|Grande Prairie
YQA|Gravenhurst|CA|Muskoka
YGV|Havre-Saint-Pierre|CA|Havre-Saint-Pierre
YHY|Hay River|CA|Hay River / Merlyn Carter
YOJ|High Level|CA|High Level
YEV|Inuvik|CA|Inuvik Mike Zubko
YFB|Iqaluit|CA|Iqaluit
YIV|Island Lake|CA|Island Lake
YKA|Kamloops|CA|Kamloops John Moose Fulton Field Regional
XKS|Kasabonika|CA|Kasabonika
YQK|Kenora|CA|Kenora
YVP|Kuujjuaq|CA|Kuujjuaq
YGW|Kuujjuarapik|CA|Kuujjuarapik
YGL|La Grande Rivière|CA|La Grande Rivière
YVC|La Ronge|CA|La Ronge
YGR|Les Îles-de-la-Madeleine|CA|Îles-de-la-Madeleine
YQL|Lethbridge|CA|Lethbridge County
YLL|Lloydminster|CA|Lloydminster
YXU|London|CA|London International
YYL|Lynn Lake|CA|Lynn Lake
ZMT|Masset|CA|Masset
YXH|Medicine Hat|CA|Medicine Hat Regional
YQM|Moncton|CA|Greater Moncton Roméo LeBlanc International
YYY|Mont-Joli|CA|Mont Joli
YHU|Montréal|CA|Montréal / Saint-Hubert Metropolitan
YMX|Montréal|CA|Montreal Mirabel International
YMO|Moosonee|CA|Moosonee
YQN|Nakina|CA|Nakina
YCD|Nanaimo|CA|Nanaimo
YNA|Natashquan|CA|Natashquan
YCM|Niagara-on-the-Lake|CA|Niagara District
YVQ|Norman Wells|CA|Norman Wells
YYB|North Bay|CA|North Bay Jack Garland
YRO|Ottawa|CA|Ottawa / Rockcliffe
YPE|Peace River|CA|Peace River
YYF|Penticton|CA|Penticton
YPQ|Peterborough|CA|Peterborough Regional
YPL|Pickle Lake|CA|Pickle Lake
YNL|Points North Landing|CA|Points North Landing
YZT|Port Hardy|CA|Port Hardy
YPN|Port-Menier|CA|Port-Menier
YPW|Powell River|CA|Powell River
YPA|Prince Albert|CA|Prince Albert Glass Field
YXS|Prince George|CA|Prince George (International)
YPR|Prince Rupert|CA|Prince Rupert
YPX|Puvirnituq|CA|Puvirnituq
XQU|Qualicum Beach|CA|Qualicum Beach
YQZ|Quesnel|CA|Quesnel
YRT|Rankin Inlet|CA|Rankin Inlet
YRL|Red Lake|CA|Red Lake
YQR|Regina|CA|Regina International
YRB|Resolute Bay|CA|Resolute Bay
YRJ|Roberval|CA|Roberval
YUY|Rouyn-Noranda|CA|Rouyn Noranda
YBG|Saguenay|CA|Saguenay-Bagotville
YSJ|Saint John|CA|Saint John
YZP|Sandspit|CA|Sandspit
ZSJ|Sandy Lake|CA|Sandy Lake
YUX|Sanirajak|CA|Hall Beach
YAM|Sault Ste Marie|CA|Sault Ste Marie
YKL|Schefferville|CA|Schefferville
YZV|Sept-Îles|CA|Sept-Îles
YXL|Sioux Lookout|CA|Sioux Lookout
YYD|Smithers|CA|Smithers
ZBF|South Tetagouche|CA|Bathurst
YIF|St-Augustin|CA|St Augustin
YAY|St. Anthony|CA|St. Anthony
YSF|Stony Rapids|CA|Stony Rapids
YSB|Sudbury|CA|Sudbury
YQY|Sydney|CA|Sydney / J.A. Douglas McCurdy
YXT|Terrace|CA|Northwest Regional Airport Terrace-Kitimat
YQD|The Pas|CA|The Pas
YTH|Thompson|CA|Thompson
YQT|Thunder Bay|CA|Thunder Bay International
YTS|Timmins|CA|Timmins/Victor M. Power
YAZ|Tofino|CA|Tofino / Long Beach
YTZ|Toronto|CA|Billy Bishop Toronto City
YVO|Val-d'Or|CA|Val-d'Or
YWK|Wabush|CA|Wabush
YQH|Watson Lake|CA|Watson Lake
YZU|Whitecourt|CA|Whitecourt
YXY|Whitehorse|CA|Whitehorse / Erik Nielsen International
YVV|Wiarton|CA|Wiarton
YWL|Williams Lake|CA|Williams Lake
YZF|Yellowknife|CA|Yellowknife International
FDU|Bandundu|CD|Bandundu
BUX|Bunia|CD|Bunia
BDT|Gbadolite|CD|Gbadolite
GMA|Gemena|CD|Gemena
IRP|Isiro|CD|Matari
FMI|Kalemie|CD|Kalemie
KGA|Kananga|CD|Kananga
KKW|Kikwit|CD|Kikwit
KND|Kindu|CD|Kindu
KWZ|Kolwezi|CD|Kolwezi
MDK|Mbandaka|CD|Mbandaka
MJM|Mbuji Mayi|CD|Mbuji Mayi
LUG|Agno|CH|Lugano
BRN|Bern|CH|Bern
ACH|St. Gallen|CH|Sankt Gallen Altenrhein
BYK|Bouaké|CI|Bouaké
HGO|Korhogo|CI|Korhogo
SPY|San Pedro|CI|San Pedro
ARI|Arica|CL|Chacalluta International
BBA|Balmaceda|CL|Balmaceda
CJC|Calama|CL|El Loa
CPO|Copiapo|CL|Desierto de Atacama
ESR|El Salvador|CL|Ricardo García Posada
LSC|La Serena-Coquimbo|CL|La Florida
ZOS|Osorno|CL|Cañal Bajo Carlos Hott Siebert
PNT|Puerto Natales|CL|Lieutenant Julio Gallardo
ZAL|Valdivia|CL|Pichoy
MVR|Maroua|CM|Salak
NGE|N'Gaoundéré|CM|N'Gaoundéré
AKU|Aksu (Onsu)|CN|Aksu Hongqipo
AAT|Altay|CN|Altay Xuedu
AQG|Anqing|CN|Anqing Tianzhushan Airport / Anqing North Air Base
AOG|Anshan|CN|Anshan Teng'ao Airport / Anshan Air Base
AVA|Anshun (Xixiu)|CN|Anshun Huangguoshu
YIE|Arxan|CN|Arxan Yi'ershi
DBC|Baicheng|CN|Baicheng Chang'an
AEB|Baise (Tianyang)|CN|Baise (Bose) Bama
NBS|Baishan|CN|Changbaishan
BPX|Bangda|CN|Qamdo Bangda
BSD|Baoshan (Longyang)|CN|Baoshan Yunrui
TCZ|Baoshan (Tengchong)|CN|Tengchong Tuofeng
AXF|Bayanhot|CN|Alxa Left Banner Bayanhot
RLK|Bayannur|CN|Bayannur Tianjitai
BZX|Bazhong|CN|Bazhong Enyang
BHY|Beihai|CN|Beihai Fucheng
BFY|Bengbu|CN|Bengbu Tenghu
BFJ|Bijie|CN|Bijie Feixiong
BPL|Bole|CN|Bole Alashankou
KJI|Burqin|CN|Burqin Kanas
CGD|Changde (Dingcheng)|CN|Changde Taohuayuan
CZX|Changzhou|CN|Changzhou Benniu International
CDE|Chengde|CN|Chengde Puning
HCZ|Chenzhou|CN|Chenzhou Beihu
CIF|Chifeng|CN|Chifeng Yulong
DLU|Dali (Xiaguan)|CN|Dali Fengyi
DDG|Dandong (Zhenxing)|CN|Dandong Langtou International
DZH|Dazhou (Dachuan)|CN|Dazhou Jinya
LUM|Dehong (Mangshi)|CN|Dehong Mangshi International
HXD|Delingha|CN|Haixi Delingha
DIG|Diqing (Shangri-La)|CN|Diqing Shangri-La
DOY|Dongying (Kenli)|CN|Dongying Shengli
ENH|Enshi (Enshi)|CN|Enshi Xujiaping
ERL|Erenhot|CN|Erenhot Saiwusu International
FUO|Foshan (Nanhai)|CN|Foshan Shadi
FYJ|Fuyuan|CN|Fuyuan Dongji
FYN|Fuyun|CN|Fuyun Koktokay
GXH|Gannan (Xiahe)|CN|Gannan Xiahe
DCY|Garzê (Daocheng)|CN|Daocheng Yading
KGT|Garzê (Kangding)|CN|Kangding
GOQ|Golmud|CN|Golmud
GMQ|Golog (Maqên)|CN|Golog Maqên
GYS|Guangyuan (Lizhou)|CN|Guangyuan Panlong
GYU|Guyuan (Yuanzhou)|CN|Guyuan Liupanshan
HMI|Hami|CN|Hami
HDG|Handan|CN|Handan
HZG|Hanzhong (Chenggu)|CN|Hanzhong Chenggu
HCJ|Hechi (Jinchengjiang)|CN|Hechi Jinchengjiang
DTU|Heihe|CN|Wudalianchi Dedu
HEK|Heihe|CN|Heihe Aihui
HZA|Heze (Dingtao)|CN|Heze Mudan
HUO|Holingol|CN|Holingol Huolinhe
HTN|Hotan|CN|Hotan
HJJ|Huaihua|CN|Huaihua Zhijiang
HUZ|Huizhou (Pingtan)|CN|Huizhou Pingtan
YIN|Ili (Yining / Ghulja)|CN|Ili Yining International
JGS|Ji'an|CN|Jinggangshan
JGD|Jiagedaqi|CN|Daxing'anling Elunchun
JMU|Jiamusi|CN|Jiamusi Songjiang International
JSJ|Jiansanjiang|CN|Jiansanjiang Shidi
JIC|Jinchang|CN|Jinchang Jinchuan
JDZ|Jingdezhen|CN|Jingdezhen Luojia
SHS|Jingzhou (Shashi)|CN|Jingzhou Shashi
JNG|Jining|CN|Jining Da'an
JNZ|Jinzhou (Linghai)|CN|Jinzhou Bay
JXA|Jixi|CN|Jixi Xingkaihu
KJH|Kaili  (Huangping)|CN|Kaili Huangping
KRL|Korla|CN|Korla Licheng
LSG|Leshan (Wutongqiao)|CN|Leshan
XIC|Liangshan (Xichang)|CN|Xichang Qingshan
LNJ|Lincang|CN|Lincang Boshang
CWJ|Lincang (Cangyuan)|CN|Cangyuan Washan
LFQ|Linfen (Yaodu)|CN|Linfen Yaodu
LYI|Linyi (Hedong)|CN|Linyi Qiyang
HZH|Liping|CN|Liping
LPF|Liupanshui (Zhongshan)|CN|Liupanshui Yuezhao
LZH|Liuzhou (Liujiang)|CN|Liuzhou Bailian Airport / Bailian Air Base
LNL|Longnan (Cheng)|CN|Longnan Chengzhou
LCX|Longyan (Liancheng)|CN|Liancheng Guanzhishan
LZO|Luzhou (Yunlong)|CN|Luzhou Yunlong
LLV|Lüliang|CN|Lüliang Dawu
NZH|Manzhouli|CN|Manzhouli Xijiao
HTT|Mengnai|CN|Huatugou
MIG|Mianyang (Fucheng)|CN|Mianyang Nanjiao
OHE|Mohe|CN|Mohe Gulian
MDG|Mudanjiang|CN|Mudanjiang Hailang International
LZG|Nanchong (Langzhong)|CN|Langzhong Gucheng
NTG|Nantong (Tongzhou)|CN|Nantong Xingdong International
JZH|Ngawa (Songpan)|CN|Jiuzhai Huanglong
NLH|Ninglang|CN|Ninglang Luguhu
LZY|Nyingchi (Mainling)|CN|Nyingchi Mainling
PZI|Panzhihua (Renhe)|CN|Panzhihua Bao'anying
JMJ|Pu'er (Lancang)|CN|Lancang Jingmai
YSQ|Qian Gorlos Mongol Autonomous County|CN|Songyuan Chaganhu
JIQ|Qianjiang|CN|Qianjiang Wulingshan
IQM|Qiemo|CN|Qiemo Yudu
IQN|Qingyang (Xifeng)|CN|Qingyang Xifeng
BPE|Qinhuangdao (Changli)|CN|Qinhuangdao Beidaihe
BAR|Qionghai (Basuo)|CN|Qionghai Bo'ao
JUZ|Quzhou (Kezheng)|CN|Quzhou
RIZ|Rizhao (Donggang)|CN|Rizhao Shanzihe
RQA|Ruoqiang Town|CN|Ruoqiang Loulan
SQJ|Sanming (Sha)|CN|Sanming Shaxian
QSZ|Shache|CN|Shache
SQD|Shangrao (Hengfeng)|CN|Shangrao Sanqingshan
HSC|Shaoguan|CN|Shaoguan Danxia
WGN|Shaoyang (Wugang)|CN|Shaoyang Wugang
HPG|Shennongjia (Hongping)|CN|Shennongjia Hongping
NGQ|Shiquanhe|CN|Ngari Gunsa
WDS|Shiyan (Maojian)|CN|Shiyan Wudangshan
CHG|Shuangta, Chaoyang|CN|Chaoyang
SZH|Shuozhou|CN|Shuozhou Zirun
HYN|Taizhou (Luqiao)|CN|Taizhou Luqiao
WUZ|Tangbu|CN|Wuzhou Xijiang
HQL|Tashikuergan|CN|Tashikuergan Hongqilafu
THQ|Tianshui (Maiji)|CN|Tianshui Maijishan
TNH|Tonghua|CN|Tonghua Sanyuanpu
TGO|Tongliao|CN|Tongliao
TEN|Tongren (Daxing)|CN|Tongren Fenghuang
TLQ|Turpan|CN|Turpan Jiaohe
UCB|Ulanqab|CN|Ulanqab Jining
WEF|Weifang (Kuiwen)|CN|Weifang Nanyuan
WEH|Weihai|CN|Weihai Dashuibo
WUA|Wuhai|CN|Wuhai
WHA|Wuhu|CN|Wuhu Xuanzhou
CQW|Wulong|CN|Chongqing Xiannüshan
WUS|Wuyishan|CN|Nanping Wuyishan
XFN|Xiangyang (Xiangzhou)|CN|Xiangyang Liuji
DDR|Xigazê (Dingri)|CN|Shigatse Tingri
XIL|Xilinhot|CN|Xilinhot
ACX|Xingyi|CN|Xingyi Wanfenglin
XAI|Xinyang|CN|Xinyang Minggang
NLT|Xinyuan|CN|Xinyuan Nalati
JNH|Xiuzhou, Hangzhou|CN|Jiaxing Nanhu
XUZ|Xuzhou|CN|Xuzhou Guanyin International
ENY|Yan'an (Baota)|CN|Yan'an Nanniwan
YTY|Yangzhou|CN|Yangzhou Taizhou
YNJ|Yanji|CN|Yanji Chaoyangchuan
YBP|Yibin (Cuiping)|CN|Yibin Wuliangye
YIH|Yichang (Xiaoting)|CN|Yichang Sanxia
YIC|Yichun|CN|Yichun Mingyueshan
LDS|Yichun|CN|Yichun Lindu
YKH|Yingkou (Laobian)|CN|Yingkou Lanqi
FUG|Yingzhou, Fuyang|CN|Fuyang Xiguan
LLF|Yongzhou|CN|Yongzhou Lingling
YYA|Yueyang (Yueyanglou)|CN|Yueyang Sanhe
YLX|Yulin|CN|Yulin Fumian
UYN|Yulin|CN|Yulin Yuyang
YUS|Yushu (Batang)|CN|Yushu Batang
NZL|Zhalantun|CN|Zhalantun Genghis Khan
ZQZ|Zhangjiakou|CN|Zhangjiakou Ningyuan
YZY|Zhangye (Ganzhou)|CN|Zhangye Ganzhou
ZAT|Zhaotong|CN|Zhaotong Zhaoyang
ZHY|Zhongwei (Shapotou)|CN|Zhongwei Shapotou
WMT|Zunyi|CN|Zunyi Maotai
ZYI|Zunyi|CN|Zunyi Xinzhou
AUC|Arauca|CO|Santiago Perez
AXM|Armenia|CO|El Eden
BSC|Bahía Solano|CO|José Celestino Mutis
EJA|Barrancabermeja|CO|Yariguíes
BGA|Bucaramanga|CO|Palonegro
BUN|Buenaventura|CO|Gerardo Tobar López
APO|Carepa|CO|Antonio Roldán Betancur
PSO|Chachagüí|CO|Antonio Nariño
CZU|Corozal|CO|Las Brujas
CUC|Cúcuta|CO|Camilo Daza International
FLA|Florencia|CO|Gustavo Artunduaga Paredes
GPI|Guapi|CO|Guapi
IBE|Ibagué|CO|Perales
IPI|Ipiales|CO|San Luis
LET|Leticia|CO|Alfredo Vásquez Cobo International
MZL|Manizales|CO|La Nubia
EOH|Medellín|CO|Enrique Olaya Herrera
MVP|Mitú|CO|Fabio Alberto Leon Bentley
MTR|Montería|CO|Los Garzones
NVA|Neiva|CO|Benito Salas
PEI|Pereira|CO|Matecaña International
PPN|Popayán|CO|Guillermo León Valencia
PVA|Providencia|CO|El Embrujo
PUU|Puerto Asís|CO|Tres De Mayo
PCR|Puerto Carreño|CO|German Olano
PDA|Puerto Inírida|CO|Obando Cesar Gaviria Trujillo
UIB|Quibdó|CO|El Caraño
RCH|Riohacha|CO|Almirante Padilla
SJE|San José Del Guaviare|CO|Jorge E. Gonzalez Torres
SVI|San Vicente Del Caguán|CO|Eduardo Falla Solano
SMR|Santa Marta|CO|Simón Bolívar International
TME|Tame|CO|Gustavo Vargas
TCO|Tumaco|CO|La Florida
VUP|Valledupar|CO|Alfonso López Pumarejo
VVC|Villavicencio|CO|Vanguardia
EYP|Yopal|CO|El Alcaravan - Yopal
GLF|Golfito|CR|Golfito
FON|La Fortuna|CR|La Fortuna Arenal
LIO|Limón|CR|Limón International
NOB|Nicoya|CR|Nosara
PJM|Puerto Jimenez|CR|Puerto Jimenez
XQP|Quepos|CR|Quepos Managua
SYQ|San Jose|CR|Tobías Bolaños International
BCA|Baracoa|CU|Gustavo Rizo
BYM|Bayamo|CU|Carlos Manuel de Cespedes
CCC|Cayo Coco|CU|Jardines Del Rey
CYO|Cayo Largo del Sur|CU|Vilo Acuña International
CFG|Cienfuegos|CU|Jaime Gonzalez
VTU|Las Tunas|CU|Hermanos Ameijeiras
MZO|Manzanillo|CU|Sierra Maestra International
GER|Nueva Gerona|CU|Rafael Cabrera
TND|Trinidad|CU|Alberto Delgado
SNE|Preguiça|CV|Preguiça
MMO|Vila do Maio|CV|Maio
XCH|Flying Fish Cove|CX|Christmas Island International
BRQ|Brno|CZ|Brno-Tuřany
RLG|Laage|DE|Rostock-Laage
LBC|Lübeck|DE|Lübeck Blankensee
MHG|Mannheim|DE|Mannheim-City
SCN|Saarbrücken|DE|Saarbrücken
GWT|Sylt|DE|Westerland Sylt
FCN|Wurster Nordseeküste|DE|Sea-Airport Cuxhaven/Nordholz / Nordholz Naval Airbase
HDF|Zirchow|DE|Heringsdorf
EBJ|Esbjerg|DK|Esbjerg
KRP|Karup|DK|Midtjyllands Airport / Air Base Karup
RKE|Roskilde|DK|Copenhagen Roskilde
RNN|Rønne|DK|Bornholm
SGD|Sønderborg|DK|Sønderborg
DCF|Canefield|DM|Canefield
DOM|Marigot|DM|Douglas-Charles
BRX|Barahona|DO|Maria Montez International
JBQ|La Isabela|DO|La Isabela International
POP|Puerto Plata|DO|Gregorio Luperon International
AZS|Samana|DO|Samaná El Catey International
AZR|Adrar|DZ|Touat-Cheikh Sidi Mohamed Belkebir
BMW|Bordj Badji Mokhtar|DZ|Bordj Badji Mokhtar
CBH|Béchar|DZ|Béchar Boudghene Ben Ali Lotfi
GHA|El Atteuf|DZ|Noumérat - Moufdi Zakaria
ELG|El Menia|DZ|El Golea
ELU|Guemar|DZ|Guemar Airport - مطار قمار بالوادي
HME|Hassi Messaoud|DZ|Hassi Messaoud-Oued Irara Krim Belkacem
VVZ|Illizi|DZ|Illizi Takhamalt
IAM|In Aménas|DZ|Zarzaitine - In Aménas
INZ|In Salah|DZ|In Salah
LOO|Laghouat|DZ|Laghouat - Molay Ahmed Medeghri
MZW|Mecheria|DZ|Mecheria
OGX|Ouargla|DZ|Ain Beida
QSF|Sétif|DZ|Ain Arnat
TMX|Timimoun|DZ|Timimoun
TIN|Tindouf|DZ|Tindouf
TGR|Touggourt|DZ|Touggourt Sidi Madhi
TEE|Tébessi|DZ|Cheikh Larbi Tébessi
OCC|Coca|EC|Francisco De Orellana
CUE|Cuenca|EC|Mariscal Lamar
GPS|Isla Baltra|EC|Seymour Galapagos Ecological
LTX|Latacunga|EC|Cotopaxi International
XMS|Macas|EC|Coronel E Carvajal
MEC|Manta|EC|Eloy Alfaro International
ETR|Santa Rosa|EC|Santa Rosa - Artillery Colonel Victor Larrea International
TUA|Tulcán|EC|Lieutenant Colonel Luis A. Mantilla International
URE|Kuressaare|EE|Kuressaare
KDL|Kärdla|EE|Kärdla
EPU|Pärnu|EE|Pärnu
TAY|Tartu|EE|Tartu
ABS|Abu Simbel|EG|Abu Simbel
CCE|New Cairo|EG|Capital International
TCP|Taba|EG|Taba International
SMW|Smara|EH|Smara
ASM|Asmara|ER|Asmara International
VIT|Alava|ES|Vitoria
LEI|Almería|ES|Almería
BJZ|Badajoz|ES|Badajoz
CDT|Castellón de la Plana|ES|Castellón-Costa Azahar
LCG|Culleredo|ES|A Coruña
ODB|Córdoba|ES|Córdoba
VDE|El Hierro Island|ES|El Hierro
GRX|Granada|ES|F.G.L. Airport Granada-Jaén
EAS|Hondarribia|ES|San Sebastián
XRY|Jerez de la Frontera|ES|Jerez
LEU|La Seu d'Urgell Pyrenees and Andorra|ES|Pirineus - la Seu d'Urgel
LEN|La Virgen del Camino|ES|León
ILD|Lleida|ES|Lleida-Alguaire
RJL|Logroño|ES|Logroño-Agoncillo
MLN|Melilla|ES|Melilla
PNA|Pamplona|ES|Pamplona
SLM|Salamanca|ES|Salamanca
SDR|Santander|ES|Seve Ballesteros-Santander
SPC|Sta Cruz de la Palma, La Palma Island|ES|La Palma
VLL|Valladolid|ES|Valladolid
VGO|Vigo|ES|Vigo
AMH|Arba Minch|ET|Arba Minch
ASO|Asosa|ET|Asosa
AXU|Axum|ET|Axum
GDQ|Azezo|ET|Gondar
BJR|Bahir Dar|ET|Bahir Dar
GMB|Gambela|ET|Gambela
GDE|Gode|ET|Gode
JIM|Jimma|ET|Jimma
BCO|Jinka|ET|Jinka
ABK|Kebri Dahar|ET|Kebri Dahar
MQX|Mekele|ET|Mekele Alula Aba Nega
ENF|Enontekio|FI|Enontekio
JOE|Joensuu|FI|Joensuu
JYV|Jyväskylän Maalaiskunta|FI|Jyväskylä
KAJ|Kajaani|FI|Kajaani
KEM|Kemi / Tornio|FI|Kemi-Tornio
KOK|Kokkola / Kruunupyy|FI|Kokkola-Pietarsaari
KAO|Kuusamo|FI|Kuusamo
MHQ|Mariehamn|FI|Mariehamn
POR|Pori|FI|Pori
SVL|Savonlinna|FI|Savonlinna
LBS|Labasa|FJ|Labasa
MPN|Mount Pleasant|FK|Mount Pleasant Airport / RAF Mount Pleasant
PNI|Pohnpei Island|FM|Pohnpei International
AJA|Ajaccio|FR|Ajaccio Napoléon Bonaparte airport
NCY|Annecy|FR|Annecy Meythet airport
AUR|Aurillac|FR|Aurillac airport
AVN|Avignon|FR|Avignon Caumont airport
EGC|Bergerac|FR|Bergerac Dordogne-Périgord airport
BIQ|Biarritz|FR|Biarritz Pays Basque airport
BVE|Brive|FR|Brive Souillac airport
BZR|Béziers|FR|Béziers Vias airport
CFR|Caen|FR|Caen Carpiquet airport
CLY|Calvi|FR|Calvi Sainte Catherine
CCF|Carcassonne|FR|Carcassonne Salvaza
DCM|Castres|FR|Castres Mazamet
XCR|Chalons en Champagne|FR|Chalons Vatry airport
CMF|Chambéry|FR|Chambéry Aix les Bains airport
DOL|Deauville|FR|Deauville Normandie airport
DLE|Dole|FR|Dole Tavaux
ETZ|Goin|FR|Metz-Nancy-Lorraine
GNB|Grenoble|FR|Grenoble Alpes Isère
TLN|Hyères, Var|FR|Toulon-Hyères
LRH|La Rochelle|FR|La Rochelle Île de Ré
LIG|Limoges/Bellegarde|FR|Limoges
FNI|Nîmes/Garons|FR|Nîmes-Arles-Camargue
PUF|Pau/Pyrénées (Uzein)|FR|Pau Pyrénées
PGF|Perpignan/Rivesaltes|FR|Perpignan-Rivesaltes (Llabanère)
PIS|Poitiers/Biard|FR|Poitiers-Biard
RDZ|Rodez/Marcillac|FR|Rodez–Aveyron
RNS|Saint-Jacques-de-la-Lande, Ille-et-Vilaine|FR|Rennes-Saint-Jacques
LDE|Tarbes/Lourdes/Pyrénées|FR|Tarbes-Lourdes-Pyrénées
TUF|Tours, Indre-et-Loire|FR|Tours Val de Loire
MVB|Franceville|GA|M'Vengue El Hadj Omar Bongo Ondimba International
MKU|Makokou|GA|Makokou
OYE|Oyem|GA|Oyem
TRE|Balemartine, Argyll and Bute|GB|Tiree
BEB|Balivanich|GB|Benbecula
BHD|Belfast|GB|George Best Belfast City
BOH|Bournemouth|GB|Bournemouth
CAL|Campbeltown|GB|Campbeltown
MME|Darlington, Durham|GB|Teesside International
LDY|Derry, Derry and Strabane|GB|City of Derry
DND|Dundee|GB|Dundee
EOI|Eday|GB|Eday
BRR|Eoligarry|GB|Barra
EXT|Exeter, Devon|GB|Exeter International
HUY|Grimsby, Lincolnshire|GB|Humberside
INV|Inverness, Highland|GB|Inverness
ILY|Isle of Islay, Argyll and Bute|GB|Islay
KOI|Kirkwall, Orkney Islands|GB|Kirkwall
LSI|Lerwick, Shetland|GB|Sumburgh
LCY|London|GB|London City
NQY|Newquay|GB|Cornwall Airport Newquay
NWI|Norwich, Norfolk|GB|Norwich
SOU|Southampton|GB|Southampton
SEN|Southend-on-Sea, Essex|GB|London Southend
SYY|Stornoway, Western Isles|GB|Stornoway
WIC|Wick|GB|Wick John O'Groats
MPY|Maripasoula|GF|Maripasoula
LDX|Saint-Laurent-du-Maroni|GF|Saint-Laurent-du-Maroni
ACI|Saint Anne|GG|Alderney
GCI|Saint Peter Port|GG|Guernsey
TKD|Sekondi-Takoradi|GH|Takoradi
NYI|Sunyani|GH|Sunyani
JEG|Aasiaat|GL|Aasiaat
JAV|Ilulissat|GL|Ilulissat
SFJ|Kangerlussuaq|GL|Kangerlussuaq International
KUS|Kulusuk|GL|Kulusuk
CNP|Neerlerit Inaat|GL|Neerlerit Inaat
NAQ|Qaanaaq|GL|Qaanaaq
JJU|Qaqortoq|GL|Qaqortoq
JHS|Sisimiut|GL|Sisimiut
GBJ|Grand-Bourg|GP|Marie-Galante
GEM|Mengomeyén|GQ|President Obiang Nguema International
AXD|Alexandroupolis|GR|Alexandroupoli Democritus
JKH|Chios Island|GR|Chios Island National
JSH|Crete Island|GR|Sitia
IOA|Ioannina|GR|Ioannina King Pyrrhus National
KLX|Kalamata|GR|Kalamata
AOK|Karpathos Island|GR|Karpathos
KZI|Kozani|GR|Kozani National Airport Filippos
JMK|Mykonos|GR|Mykonos Island National
MJT|Mytilene|GR|Mytilene International
VOL|Nea Anchialos|GR|Nea Anchialos National
GPA|Patras|GR|Patras Araxos Agamemnon
PVK|Preveza|GR|Aktion National
SMI|Samos Island|GR|Samos
JSI|Skiathos|GR|Skiathos Island National
PBR|Puerto Barrios|GT|Puerto Barrios
RER|Retalhuleu|GT|Retalhuleu
FRS|San Benito|GT|Mundo Maya International
KAI|Kaieteur Falls|GY|Kaieteur
LTM|Lethem|GY|Lethem
OGL|Ogle|GY|Eugene F. Correia International
GJA|Guanaja|HN|La Laguna
LCE|La Ceiba|HN|Golosón International
TGU|Tegucigalpa|HN|Toncontín
BWK|Gornji Humac|HR|Brač
OSI|Osijek(Klisa)|HR|Osijek
JEE|Carrefour Sanon|HT|Jérémie
CYA|Les Cayes|HT|Antoine-Simon International
SOB|Sármellék|HU|Hévíz–Balaton
TKG|Bandar Lampung|ID|Radin Inten II International
BDO|Bandung|ID|Husein Sastranegara International
BKS|Bengkulu|ID|Fatmawati Soekarno
BIK|Biak|ID|Frans Kaisiepo
UGU|Bilogai|ID|Bilorai
BMU|Bima|ID|Sultan Muhammad Salahuddin
CXP|Cilacap|ID|Tunggul Wulung
DUM|Dumai|ID|Pinang Kampai
FKQ|Fakfak|ID|Fakfak
GNS|Gunungsitoli|ID|Binaka
KNG|Kaimana|ID|Utarom
DHX|Kediri|ID|Dhoho International
KJT|Kertajati|ID|Kertajati International
KTG|Ketapang|ID|Rahadi Osman
KXB|Kolaka|ID|Sangia Nibandera
MEQ|Kuala Pesisir|ID|Cut Nyak Dhien
KOE|Kupang|ID|El Tari
LSR|Kutacane|ID|Alas Leuser
LUV|Langgur|ID|Karel Sadsuitubun
MLG|Malang|ID|Abdul Rachman Saleh
MKW|Manokwari|ID|Rendani
MKQ|Merauke|ID|Mopah International
NAM|Namniwel|ID|Namniwel
NPO|Nanga Pinoh-Borneo Island|ID|Nanga Pinoh
OKL|Oksibil|ID|Oksibil
PKY|Palangkaraya|ID|Tjilik Riwut
PLM|Palembang|ID|Sultan Mahmud Badaruddin II
PLW|Palu|ID|Mutiara - SIS Al-Jufrie
PGK|Pangkal Pinang|ID|Depati Amir
PKU|Pekanbaru|ID|Sultan Syarif Kasim II International Airport / Roesmin Nurjadin AFB
PSU|Putussibau-Borneo Island|ID|Pangsuma
NTX|Ranai-Natuna Besar Island|ID|Ranai
AAP|Samarinda|ID|Aji Pangeran Tumenggung Pranoto International
FLZ|Sibolga (Pinangsori)|ID|Dr. Ferdinand Lumban Tobing
SQG|Sintang|ID|Tebelian
SOQ|Sorong|ID|Domine Eduard Osok
NAH|Tabukan Utara, Sangihe Islands|ID|Naha
TXE|Takengon|ID|Rembele
PDO|Talang Gudang-Sumatra Island|ID|Pendopo
TMH|Tanah Merah|ID|Tanah Merah
TNJ|Tanjung Pinang-Bintan Island|ID|Raja Haji Fisabilillah International
BEJ|Tanjung Redeb - Borneo Island|ID|Kalimarau
TJG|Tanta-Tabalong|ID|Warukin
TRK|Tarakan|ID|Juwata International Airport / Suharnoko Harbani AFB
TTE|Ternate|ID|Sultan Babullah
TIM|Timika|ID|Mozes Kilangin
TRT|Toraja|ID|Toraja
WMX|Wamena|ID|Wamena
WNI|Wangi-wangi Island|ID|Matahora
JOG|Yogyakarta|ID|Adisutjipto International
CFN|Donegal|IE|Donegal
KIR|Farranfore|IE|Kerry
HFA|Haifa|IL|Uri Michaeli Haifa International
IXA|Agartala|IN|Agartala - Maharaja Bir Bikram
AGX|Agatti|IN|Agatti
AGR|Agra|IN|Agra Airport / Agra Air Force Station
AJL|Aizawl (Lengpui)|IN|Lengpui
KQH|Ajmer (Kishangarh)|IN|Kishangarh Airport Ajmer
IXD|Allahabad|IN|Prayagraj
AHA|Ambikapur|IN|Maa Mahamaya
AVR|Amravati|IN|Amravati
IXU|Aurangabad|IN|Aurangabad
BEK|Bareilly|IN|Bareilly Air Force Station
IXG|Belgaum|IN|Belagavi
BHU|Bhavnagar|IN|Bhavnagar
UKE|Bhawanipatna|IN|Utkela
BHJ|Bhuj|IN|Bhuj
KUU|Bhuntar|IN|Kullu Manali
PAB|Bilaspur|IN|Bilaspur
SDW|Chipi|IN|Sindhudurg
DBR|Darbhanga|IN|Darbhanga
DED|Dehradun (Jauligrant)|IN|Dehradun Jolly Grant
DIB|Dibrugarh|IN|Dibrugarh
DMU|Dimapur|IN|Dimapur
RDP|Durgapur|IN|Kazi Nazrul Islam
AYJ|Faizabad|IN|Maharshi Valmiki International
GAY|Gaya|IN|Gaya
GDB|Gondia|IN|Gondia
GOP|Gorakhpur|IN|Gorakhpur
GWL|Gwalior|IN|Gwalior
HGI|Hollongi|IN|Itanagar Donyi Polo Hollongi
HBX|Hubballi|IN|Hubballi
JLR|Jabalpur|IN|Jabalpur
JSA|Jaisalmer|IN|Jaisalmer
IXJ|Jammu|IN|Jammu
JGA|Jamnagar|IN|Jamnagar
JDH|Jodhpur|IN|Jodhpur
JRH|Jorhat|IN|Jorhat
CDP|Kadapa|IN|Kadapa
IXY|Kandla|IN|Kandla
DHM|Kangra|IN|Kangra
KNU|Kanpur|IN|Kanpur
IXK|Keshod|IN|Keshod
HJR|Khajuraho|IN|Khajuraho
KLH|Kolhapur|IN|Kolhapur
LTU|Latur|IN|Murod Kond
IXL|Leh|IN|Leh Kushok Bakula Rimpochee
IXI|Lilabari|IN|Lilabari North Lakhimpur
RJA|Madhurapudi|IN|Rajahmundry
IXM|Madurai|IN|Madurai
MZS|Moradabad|IN|Moradabad
MYQ|Mysore|IN|Mysore
NDC|Nanded|IN|Nanded
KJB|Orvakal|IN|Kurnool
PGH|Pantnagar|IN|Pantnagar
IXP|Pathankot|IN|Pathankot
PAT|Patna|IN|Jay Prakash Narayan
PBD|Porbandar|IN|Porbandar
PNY|Puducherry (Pondicherry)|IN|Pondicherry
RPR|Raipur|IN|Swami Vivekananda
IXR|Ranchi|IN|Birsa Munda
REW|Rewa|IN|Rewa Airport, Chorhata, REWA
SHL|Shillong|IN|Shillong
IXS|Silchar|IN|Silchar
TEZ|Tezpur|IN|Tezpur
UDR|Udaipur|IN|Maharana Pratap
ISU|Sulaymaniyah|IQ|Jalal Talabani International
AEU|Abu Musa|IR|Abu Musa Island
ADU|Ardabil|IR|Ardabil
BXR|Bam|IR|Bam
BDH|Bandar Lengeh|IR|Bandar Lengeh International
BJB|Bojnord|IR|Bojnord
BUZ|Bushehr|IR|Bushehr
DEF|Dezful|IR|Dezful
GCH|Gachsaran|IR|Gachsaran
HDM|Hamadan|IR|Hamadan
KKS|Kashan|IR|Kashan
KSH|Kermanshah|IR|Shahid Ashrafi Esfahani
KHK|Khark|IR|Khark
PGU|Khiyaroo|IR|Persian Gulf International
KHD|Khoram Abad|IR|Khoram Abad
ZBR|Konarak|IR|Chabahar Konarak International
LFM|Lamerd|IR|Lamerd
LRR|Lar|IR|Lar
MRX|Mahshahr|IR|Mahshahr
NSH|Nowshahr|IR|Nowshahr
RJN|Rafsanjan|IR|Rafsanjan
RZR|Ramsar|IR|Ramsar
RAS|Rasht|IR|Sardar-e-Jangal
AFZ|Sabzevar|IR|Sabzevar National
SDG|Sanandaj|IR|Sanandaj
SRY|Sari|IR|Sari Dasht-e Naz International
OMH|Urmia|IR|Urmia
AZD|Yazd|IR|Shahid Sadooghi
EGS|Egilsstaðir|IS|Egilsstaðir
GRY|Grímsey/Sandvík|IS|Grímsey
HFN|Höfn|IS|Hornafjörður
RKV|Reykjavík|IS|Reykjavík Domestic
VPN|Vopnafjörður|IS|Vopnafjörður
IFJ|Ísafjörður|IS|Ísafjörður
AHO|Alghero|IT|Alghero-Fertilia
BZO|Bolzano (BZ)|IT|Bolzano
EBA|Campo nell'Elba (LI)|IT|Marina di Campo
CIY|Comiso|IT|Comiso
AOI|Falconara Marittima (AN)|IT|Marche
FOG|Foggia (FG)|IT|Foggia Gino Lisa
FRL|Forlì (FC)|IT|Forlì-Luigi Ridolfi International
CRV|Isola di Capo Rizzuto (KR)|IT|Crotone Sant'Anna Pythagoras
LMP|Lampedusa|IT|Lampedusa
CUF|Levaldigi (CN)|IT|Cuneo International
VBS|Montichiari (BS)|IT|Brescia Gabriele d'Annunzio
PNL|Pantelleria (TP)|IT|Pantelleria
PMF|Parma (PR)|IT|Parma
REG|Reggio Calabria|IT|Reggio Calabria
QSR|Salerno|IT|Salerno Costa d'Amalfi
TPS|Trapani (TP)|IT|Vincenzo Florio Airport Trapani-Birgi
JER|St. Peter|JE|Jersey
OCJ|Boscobel|JM|Ian Fleming International
KTP|Tinson Pen|JM|Tinson Pen
AXT|Akita|JP|Akita
TKN|Amagi|JP|Tokunoshima
AXJ|Amakusa|JP|Amakusa
ASJ|Amami|JP|Amami
FUJ|Goto|JP|Fukue
HAC|Hachijojima|JP|Hachijojima
HNA|Hanamaki|JP|Iwate Hanamaki
AKJ|Higashikagura|JP|Asahikawa
GAJ|Higashine|JP|Yamagata
IKI|Iki|JP|Iki
ISG|Ishigaki|JP|New Ishigaki
IWK|Iwakuni|JP|Iwakuni Kintaikyo
OIM|Izu Oshima|JP|Oshima
IZO|Izumo|JP|Izumo Enmusubi
KKX|Kikai|JP|Kikai
ONJ|Kitaakita|JP|Odate Noshiro
KTD|Kitadaitōjima|JP|Kitadaito
UEO|Kumejima|JP|Kumejima
KUH|Kushiro|JP|Kushiro
IWJ|Masuda|JP|Iwami
MMJ|Matsumoto|JP|Shinshu-Matsumoto
MMD|Minamidaito|JP|Minamidaito
MSJ|Misawa|JP|Misawa Airport / Misawa Air Base
MYE|Miyakejima|JP|Miyakejima
MMY|Miyakojima|JP|Miyako
SHI|Miyakojima|JP|Shimojishima
MBE|Monbetsu|JP|Monbetsu
NKM|Nagoya|JP|Nagoya Airport / JASDF Komaki Air Base
SHB|Nakashibetsu|JP|Nakashibetsu
OBO|Obihiro|JP|Tokachi-Obihiro
OIT|Oita|JP|Oita
OKI|Okinoshima|JP|Oki Global Geopark
OIR|Okushiri Island|JP|Okushiri
RIS|Rishiri|JP|Rishiri
SDS|Sado|JP|Sado
OKD|Sapporo|JP|Sapporo Okadama
SHM|Shirahama|JP|Nanki Shirahama
SYO|Shonai|JP|Shonai
FKS|Sukagawa|JP|Fukushima
TNE|Tanegashima|JP|New Tanegashima
TRA|Tarama|JP|Tarama
TTJ|Tottori|JP|Tottori Sand Dunes Conan
TOY|Toyama|JP|Toyama Kitokito
TJH|Toyooka|JP|Konotori Tajima
TSJ|Tsushima|JP|Tsushima
UBJ|Ube|JP|Yamaguchi Ube
OKE|Wadomari|JP|Okinoerabu
NTQ|Wajima|JP|Noto Satoyama
WKJ|Wakkanai|JP|Wakkanai
KUM|Yakushima|JP|Yakushima
YGJ|Yonago|JP|Yonago Kitaro Airport / JASDF Miho Air Base
OGN|Yonaguni|JP|Yonaguni
RNJ|Yoron|JP|Yoron
MMB|Ōzora|JP|Memanbetsu
NYK|Gathiuru|KE|Nanyuki Civil
LAU|Lamu|KE|Manda
MYD|Malindi|KE|Malindi International
WIL|Nairobi|KE|Nairobi Wilson
ASV|Ol Tukai|KE|Amboseli
MRE|Serena|KE|Mara Serena Lodge
WJR|Wajir|KE|Wajir
IKG|Karakol|KG|Karakol International
BBM|Battambang|KH|Battambang
HAH|Moroni|KM|Prince Said Ibrahim International
AJN|Ouani|KM|Ouani
NEV|Charlestown|KN|Vance W. Amory International
RGO|Hoemun-ri|KP|Orang (Chongjin)
DSO|Sŏndŏng-ni|KP|Sondok
WOS|Wonsan|KP|Wonsan Kalma
KUV|Gunsan|KR|Gunsan Airport / Gunsan Air Base
KWJ|Gwangju|KR|Gwangju
KPO|Pohang|KR|Pohang Airport (G-815/K-3)
HIN|Sacheon|KR|Sacheon Airport / Sacheon Air Base
USN|Ulsan|KR|Ulsan
WJU|Wonju|KR|Wonju Airport / Hoengseong Air Base (K-38/K-46)
RSU|Yeosu|KR|Yeosu
CYB|West End|KY|Charles Kirkconnell International
BXH|Balkhash|KZ|Balkhash
TDK|Taldykorgan|KZ|Taldykorgan
BOR|Ton Phueng|LA|Bokeo International
SLU|Castries|LC|George F. L. Charles
BTC|Batticaloa|LK|Batticaloa International
KCT|Galle|LK|Koggala
HRI|Mattala|LK|Mattala Rajapaksa International
TRR|Trincomalee|LK|China Bay
MLW|Monrovia|LR|Spriggs Payne
LTD|Ghadames|LY|Ghadames
AKF|Kufra|LY|Kufra
SEB|Sabha|LY|Sabha
AHU|Al Hoceima|MA|Cherif Al Idrissi
UAR|Bouarfa|MA|Bouarfa
ERH|Errachidia|MA|Moulay Ali Cherif
ESU|Essaouira|MA|Essaouira-Mogador
TTA|Tan Tan|MA|Tan Tan
TIV|Tivat|ME|Tivat
SFG|Grand Case|MF|Grand Case-l'Espérance
DIE|Antisiranana|MG|Arrachart
BPY|Besalampy|MG|Besalampy
MNJ|Mananjary|MG|Mananjary
WMN|Maroantsetra|MG|Maroantsetra
MOQ|Morondava|MG|Morondava
SVB|Sambava|MG|Sambava
TLE|Toliara|MG|Toliara
FTU|Tôlanaro|MG|Tôlanaro
SMS|Vohilava|MG|Sainte Marie
KWA|Kwajalein|MH|Bucholz Army Air Field
GAQ|Gao|ML|Gao International
KYS|Kayes|ML|Kayes Dag Dag
MZI|Sévaré|ML|Mopti
TVY|Dawei|MM|Dawei
HEH|Heho|MM|Heho
KAW|Kawthoung|MM|Kawthoung
KET|Kengtung|MM|Kengtung
KYP|Kyaukpyu|MM|Kyaukpyu
LSH|Lashio|MM|Lashio
LIW|Loikaw|MM|Loikaw
MGZ|Mkeik|MM|Myeik
MOG|Mong Hsat|MM|Mong Hsat
MYT|Myitkyina|MM|Myitkyina
PBU|Putao|MM|Putao
AKY|Sittwe|MM|Sittwe
THL|Tachileik|MM|Tachileik
SNW|Thandwe|MM|Thandwe
LTI|Altai|MN|Altai
AVK|Arvaikheer|MN|Arvaikheer
BYN|Bayankhongor|MN|Bayankhongor
UGA|Bulgan|MN|Bulgan
COQ|Choibalsan|MN|Choibalsan
DLZ|Dalanzadgad|MN|Dalanzadgad
HVD|Khovd|MN|Khovd
MXV|Mörön|MN|Mörön
ULO|Ulaangom|MN|Ulaangom
ULG|Ölgii|MN|Ölgii Mongolei International
SPN|I Fadang, Saipan|MP|Saipan International
TIQ|Tinian Island|MP|Francisco Manglona Borja / Tinian International
OUZ|Zouérate|MR|Tazadit
RRG|Port Mathurin|MU|Sir Charles Gaetan Duval
KDM|Huvadhu Atoll|MV|Kaadedhdhoo
KDO|Kadhdhoo|MV|Kadhdhoo
VAM|Maamigili|MV|Villa International Airport Maamigili
NMF|Noonu Atoll|MV|Maafaru International
CSW|Cabo San Lucas|MX|Cabo San Lucas International
CPE|Campeche|MX|Ingeniero Alberto Acuña Ongay International
CTM|Chetumal|MX|Chetumal International
TAM|Ciudad Madero|MX|General Francisco Javier Mina International
CEN|Ciudad Obregón|MX|Ciudad Obregón International
CVM|Ciudad Victoria|MX|General Pedro Jose Mendez International
CME|Ciudad del Carmen|MX|Ciudad del Carmen International
CLQ|Colima|MX|Licenciado Miguel de la Madrid International
MTT|Cosoleacaque|MX|Minatitlán/Coatzacoalcos International
DGO|Durango|MX|General Guadalupe Victoria International
GYM|Guaymas|MX|General José María Yáñez International
IZT|Ixtepec|MX|General Antonio Cárdenas Rodríguez National Airport / Ixtepec Air Base
LAP|La Paz|MX|Manuel Márquez de León International
LMM|Los Mochis|MX|Valle del Fuerte International
ZLO|Manzanillo|MX|Playa de Oro International
MAM|Matamoros|MX|General Servando Canales International
MXL|Mexicali|MX|General Rodolfo Sánchez Taboada International
NLD|Nuevo Laredo|MX|Quetzalcóatl International
PDS|Piedras Negras|MX|Piedras Negras International
PAZ|Poza Rica|MX|El Tajín National
PXM|Puerto Escondido|MX|Puerto Escondido International
REX|Reynosa|MX|General Lucio Blanco International
SLW|Saltillo|MX|Plan de Guadalupe International
SLP|San Luis Potosí|MX|Ponciano Arriaga International
TAP|Tapachula|MX|Tapachula International
TPQ|Tepic|MX|Amado Nervo National
TRC|Torreón|MX|Francisco Sarabia Tinoco International
TGZ|Tuxtla Gutiérrez|MX|Angel Albino Corzo International
UPN|Uruapan|MX|Uruapan - Licenciado y General Ignacio Lopez Rayon International
ZCL|Zacatecas|MX|General Leobardo C. Ruiz International
AOR|Alor Satar|MY|Sultan Abdul Halim
BBN|Bario|MY|Bario
BTU|Bintulu|MY|Bintulu
KBR|Kota Baharu|MY|Sultan Ismail Petra
TGG|Kuala Terengganu|MY|Sultan Mahmud
KUA|Kuantan|MY|Kuantan
LBU|Labuan|MY|Labuan
LDU|Lahad Datu|MY|Lahad Datu
LMN|Limbang|MY|Limbang
MKZ|Malacca|MY|Malacca International
MUR|Marudi|MY|Marudi
MYY|Miri|MY|Miri
MKM|Mukah|MY|Mukah
MZV|Mulu|MY|Mulu
SDK|Sandakan|MY|Sandakan
SBW|Sibu|MY|Sibu
TWU|Tawau|MY|Tawau
TOD|Tioman Island|MY|Tioman
VPY|Chimoio|MZ|Chimoio
INH|Inhambane|MZ|Inhambane
VXC|Lichinga|MZ|Lichinga
MNC|Nacala|MZ|Nacala International
POL|Pemba|MZ|Pemba
UEL|Quelimane|MZ|Quelimane
VNX|Vilanculo|MZ|Vilankulo
LUD|Luderitz|NA|Luderitz
MPA|Mpacha|NA|Katima Mulilo
OND|Ondangwa|NA|Ondangwa
OMD|Oranjemund|NA|Oranjemund
NDU|Rundu|NA|Rundu
ERS|Windhoek|NA|Eros
KNQ|Koné|NC|Koné
LIF|Lifou|NC|Lifou
MEE|Maré|NC|Maré
GEA|Nouméa|NC|Nouméa Magenta
UVE|Ouvéa|NC|Ouvéa
TGJ|Tiga|NC|Tiga
TOU|Touho|NC|Touho
ILP|Île des Pins|NC|Île des Pins
ZND|Zinder|NE|Zinder
NLK|Burnt Pine|NF|Norfolk Island International
AKR|Akure|NG|Akure
BNI|Benin|NG|Benin
CBQ|Calabar|NG|Margaret Ekpo International
GMO|Gombe|NG|Gombe Lawanti International
IBA|Ibadan|NG|Ibadan
JOS|Jos|NG|Yakubu Gowon
DKA|Katsina|NG|Umaru Musa Yar'adua
MDI|Makurdi|NG|Makurdi
QRW|Okpe|NG|Warri
QOW|Owerri|NG|Sam Mbakwe International Cargo
PHG|Port Harcourt|NG|Port Harcourt City Airport / Port Harcourt Air Force Base
QUO|Uyo|NG|Akwa Ibom International
YOL|Yola|NG|Yola
BEF|Bluefields|NI|Bluefields
PUZ|Puerto Cabezas|NI|Puerto Cabezas
SSJ|Alstahaug|NO|Sandnessjøen Airport, Stokka
ALF|Alta|NO|Alta
ANX|Andenes|NO|Andøya Airport, Andenes
BVG|Berlevåg|NO|Berlevåg
BNN|Brønnøy|NO|Brønnøysund Airport, Brønnøy
BJF|Båtsfjord|NO|Båtsfjord
FRO|Florø|NO|Florø
SKN|Hadsel|NO|Stokmarknes Airport, Skagen
HFT|Hammerfest|NO|Hammerfest
HVG|Honningsvåg|NO|Honningsvåg Airport, Valan
HAU|Karmøy|NO|Haugesund Airport, Karmøy
KKN|Kirkenes|NO|Kirkenes Airport, Høybuktmoen
KSU|Kvernberget|NO|Kristiansund Airport, Kvernberget
LKL|Lakselv|NO|Lakselv Airport, Banak
SRP|Leirvik|NO|Stord Airport, Sørstokken
LKN|Leknes|NO|Leknes
LYR|Longyearbyen|NO|Svalbard Airport, Longyear
MEH|Mehamn|NO|Mehamn
MQN|Mo i Rana|NO|Mo i Rana Airport, Røssvoll
MJF|Mosjøen|NO|Mosjøen Airport, Kjærstad
BDU|Målselv|NO|Bardufoss
RRS|Røros|NO|Røros
RVK|Rørvik|NO|Rørvik Airport, Ryum
SVJ|Svolvær|NO|Svolvær Airport, Helle
SOJ|Sørkjosen|NO|Sørkjosen
VDS|Vadsø|NO|Vadsø
VAW|Vardø|NO|Vardø Airport, Svartnes
MOL|Årø|NO|Molde Airport, Årø
OLA|Ørland|NO|Ørland
HOV|Ørsta|NO|Ørsta-Volda Airport, Hovden
BIR|Biratnagar|NP|Biratnagar
JKR|Janakpur|NP|Janakpur
LUA|Lukla|NP|Tenzing-Hillary
KEP|Nepalgunj|NP|Nepalgunj
PKR|Pokhara|NP|Pokhara Domestic
TPJ|Taplejung|NP|Taplejung
INU|Yaren|NR|Nauru International
IUE|Alofi|NU|Niue International
KAT|Awanui|NZ|Kaitaia
BHE|Blenheim|NZ|Woodbourne
DUD|Dunedin|NZ|Dunedin International
GIS|Gisborne|NZ|Gisborne
HLZ|Hamilton|NZ|Hamilton International
HKK|Hokitika|NZ|Hokitika
IVC|Invercargill|NZ|Invercargill
KKE|Kerikeri|NZ|Kerikeri
NPE|Napier|NZ|Hawke's Bay
NSN|Nelson|NZ|Nelson
NPL|New Plymouth|NZ|New Plymouth
PMR|Palmerston North|NZ|Palmerston North
ROT|Rotorua|NZ|Rotorua Regional
TUO|Taupo|NZ|Taupo
TRG|Tauranga|NZ|Tauranga
CHT|Te One|NZ|Inia William Tuuta Memorial
TIU|Timaru|NZ|Timaru
WKA|Wanaka|NZ|Wanaka
WAG|Wanganui|NZ|Wanganui
WSZ|Westport|NZ|Westport
WHK|Whakatāne|NZ|Whakatāne
WRE|Whangarei|NZ|Whangarei
KHS|Khasab|OM|Khasab
PAC|Albrook|PA|Marcos A. Gelabert International
CHX|Changuinola|PA|Changuinola Captain Manuel Niño International
CTD|Chitré|PA|Alonso Valderrama
ONX|Colón|PA|Enrique Adolfo Jimenez
DAV|David|PA|Enrique Malek International
BOC|Isla Colón|PA|Bocas del Toro "Isla Colón" International
AYP|Ayacucho|PE|Air Force Colonel Alfredo Mendivil Duarte
CJA|Cajamarca|PE|Mayor General FAP Armando Revoredo Iglesias
CHH|Chachapoyas|PE|Chachapoyas
CHM|Chimbote|PE|FAP Lieutenant Jaime Andres de Montreuil Morales
HUU|Huánuco|PE|Alferez Fap David Figueroa Fernandini
ILQ|Ilo|PE|General Jorge Fernandez Maldon
JAU|Jauja|PE|Francisco Carle
JAE|Jaén|PE|Shumba
NZC|Nazca|PE|Maria Reiche Neuman
PIU|Piura|PE|PAF Captain Guillermo Concha Iberico International
PEM|Puerto Maldonado|PE|Padre Aldamiz International
TCQ|Tacna|PE|Coronel FAP Carlos Ciriani Santa Rosa International
TYL|Talara|PE|Captain Victor Montes Arias International
TPP|Tarapoto|PE|Cadete FAP Guillermo Del Castillo Paredes
TBP|Tumbes|PE|Captain Pedro Canga Rodríguez International
YMS|Yurimaguas|PE|Moises Benzaquen Rengifo
AHE|Ahe Atoll|PF|Ahe
AAA|Anaa|PF|Anaa
AXR|Arutua|PF|Arutua
FAV|Fakarava|PF|Fakarava
FGU|Fangatau|PF|Fangatau
HUH|Fare|PF|Huahine-Fare
AUQ|Hiva Oa Island|PF|Hiva Oa-Atuona
MKP|Makemo|PF|Makemo
XMH|Manihi|PF|Manihi
MVT|Mataiva|PF|Mataiva
MAU|Maupiti|PF|Maupiti
MOZ|Moorea-Maiao|PF|Moorea Temae
BOB|Motu Mute|PF|Bora Bora
NHV|Nuku Hiva|PF|Nuku Hiva
HOI|Otepa|PF|Hao
KKR|Raitahiti|PF|Kaukura
RGI|Rangiroa|PF|Rangiroa
RUR|Rurutu|PF|Rurutu
TKP|Takapoto|PF|Takapoto
TKX|Takaroa|PF|Takaroa
GMR|Totegegie|PF|Totegegie
TUB|Tubuai|PF|Tubuai
TIH|Tuherahera|PF|Tikehau
RFP|Uturoa|PF|Raiatea
VMU|Baimuru|PG|Baimuru
OPU|Balimo|PG|Balimo
BUA|Buka Island|PG|Buka
DAU|Daru|PG|Daru
GKA|Goronka|PG|Goroka
GUR|Gurney|PG|Gurney
KVG|Kavieng|PG|Kavieng
KMA|Kerema|PG|Kerema
HKN|Kimbe|PG|Hoskins
RAB|Kokopo|PG|Tokua
CMU|Kundiawa|PG|Chimbu
MAG|Madang|PG|Madang
MAS|Manus Island|PG|Momote
MDU|Mendi|PG|Mendi
HGU|Mount Hagen|PG|Mount Hagen Kagamuga
PNP|Popondetta|PG|Girua
VAI|Vanimo|PG|Vanimo
WBM|Wapenamanda|PG|Wapenamanda
WWK|Wewak|PG|Wewak International
BSO|Basco|PH|Basco
TWT|Bongao|PH|Sanga Sanga
BXU|Butuan|PH|Bancasi
CYP|Calbayog City|PH|Calbayog
CRM|Catarman|PH|Catarman National
MPH|Caticlan|PH|Godofredo P. Ramos
CYZ|Cauayan City|PH|Cauayan
USU|Coron|PH|Francisco B. Reyes (Busuanga)
CBO|Datu Odin Sinsuat|PH|Cotabato (Awang)
DPL|Dipolog|PH|Dipolog
DGT|Dumaguete City|PH|Sibulan
JOL|Jolo|PH|Jolo
CGM|Mambajao|PH|Camiguin
MBT|Masbate|PH|Moises R. Espinosa
WNP|Naga|PH|Naga
OZC|Ozamiz|PH|Labo
PAG|Pagadian|PH|Pagadian
RXS|Roxas City|PH|Roxas
SJI|San Jose|PH|San Jose
SUG|Surigao City|PH|Surigao
TBH|Tablas Island|PH|Tugdan
TAC|Tacloban City|PH|Daniel Z. Romualdez
TUG|Tuguegarao City|PH|Tuguegarao
VRC|Virac|PH|Virac
BHV|Bahawalpur|PK|Bahawalpur
CJL|Chitral|PK|Chitral
DEA|Dera Ghazi Khan|PK|Dera Ghazi Khan
PZH|Fort Sandeman|PK|Zhob
GIL|Gilgit|PK|Gilgit
WNS|Nawabashah|PK|Shaheed Benazirabad
RYK|Rahim Yar Khan|PK|Shaikh Zaid
SKZ|Sukkur|PK|Begum Nusrat Bhutto International Airport Sukkur
BZG|Bydgoszcz|PL|Ignacy Jan Paderewski Bydgoszcz
IEG|Nowe Kramsko|PL|Zielona Góra-Babimost
RDO|Radom|PL|Warsaw Radom
SZY|Szymany|PL|Olsztyn-Mazury
FSP|Saint-Pierre|PM|Saint-Pierre Pointe-Blanche
BQN|Aguadilla|PR|Rafael Hernández International
NRR|Ceiba|PR|José Aponte de la Torre
CPX|Culebra|PR|Benjamin Rivera Noriega
MAZ|Mayaguez|PR|Eugenio Maria De Hostos
PSE|Ponce|PR|Mercedita International
SIG|San Juan|PR|Fernando Luis Ribas Dominicci
VQS|Vieques|PR|Antonio Rivera Rodriguez
BGC|Bragança|PT|Bragança
CAT|Cascais|PT|Cascais
HOR|Horta|PT|Horta
PIX|Pico Island|PT|Pico
PRM|Portimão|PT|Portimão
TER|Praia da Vitória|PT|Lajes
GRW|Santa Cruz da Graciosa|PT|Graciosa
FLW|Santa Cruz das Flores|PT|Flores
SJZ|Velas|PT|São Jorge
PXO|Vila Baleira|PT|Porto Santo
VRL|Vila Real|PT|Vila Real
SMA|Vila do Porto|PT|Santa Maria
VSE|Viseu|PT|Aerodromo Goncalves Lobato (Viseu Airport)
ARW|Arad|RO|Arad International
TGM|Recea|RO|Târgu Mureş Transilvania International
SUJ|Satu Mare|RO|Satu Mare International
BAY|Tăuții-Măgherăuș|RO|Maramureș International
KVO|Kraljevo|RS|Morava
AMV|Amderma|RU|Amderma
DYR|Anadyr|RU|Ugolny Yuri Ryktheu
PWE|Apapelgino|RU|Pevek
ARH|Archangelsk|RU|Talagi
BWO|Balakovo|RU|Balakovo
EYK|Beloyarskiy|RU|Beloyarskiy
OGZ|Beslan|RU|Vladikavkaz Beslan International
BQS|Blagoveschensk|RU|Ignatyevo
BVJ|Bovanenkovo|RU|Bovanenkovo
BTK|Bratsk|RU|Bratsk
UUA|Bugulma|RU|Bugulma
CSY|Cheboksary|RU|Cheboksary
ULY|Cherdakly|RU|Ulyanovsk Vostochny
CEE|Cherepovets|RU|Cherepovets
CYX|Cherskiy|RU|Cherskiy
CKH|Chokurdah|RU|Chokurdakh
ESL|Elista|RU|Elista
GDZ|Gelendzhik|RU|Gelendzhik
IAA|Igarka|RU|Igarka
IWA|Ivanovo|RU|Ivanovo South
IJK|Izhevsk|RU|Izhevsk
KPW|Keperveem|RU|Keperveem
KHV|Khabarovsk|RU|Khabarovsk Novy
HMA|Khanty-Mansiysk|RU|Khanty Mansiysk
HTG|Khatanga|RU|Khatanga
MQJ|Khonuu|RU|Moma
KVX|Kirov|RU|Pobedilovo
KGP|Kogalym|RU|Kogalym International
KXK|Komsomolsk-on-Amur|RU|Komsomolsk-on-Amur
KMW|Kostroma|RU|Kostroma Sokerkino
KSZ|Kotlas|RU|Kotlas
KCY|Krasnoyarsk|RU|Krasnoyarsk Cheremshanka
KRO|Kurgan|RU|Kurgan
KYZ|Kyzyl|RU|Kyzyl
ULK|Lensk|RU|Lensk
GDX|Magadan|RU|Sokol
MJZ|Mirny|RU|Mirny
NYM|Nadym|RU|Nadym
NAL|Nalchik|RU|Nalchik
NNM|Naryan Mar|RU|Naryan Mar
NER|Neryungri|RU|Chulman
NLI|Nikolayevsk-na-Amure Airport|RU|Nikolayevsk-na-Amure
NBC|Nizhnekamsk|RU|Begishevo
NOZ|Novokuznetsk|RU|Spichenkovo
NUX|Novy Urengoy|RU|Novy Urengoy
NOJ|Noyabrsk|RU|Noyabrsk
NYA|Nyagan|RU|Nyagan
OHO|Okhotsk|RU|Okhotsk
OLZ|Olyokminsk|RU|Olyokminsk
REN|Orenburg|RU|Orenburg Central
OSW|Orsk|RU|Orsk
PEX|Pechora|RU|Pechora
PEZ|Penza|RU|Penza
PES|Petrozavodsk|RU|Petrozavodsk
PKV|Pskov|RU|Princess Olga Pskov International
SBT|Sabetta|RU|Sabetta International
SLY|Salekhard|RU|Salekhard
SYS|Saskylakh|RU|Saskylakh
VEO|Severo-Yeniseysk|RU|Severo-Yeniseysk
OVS|Sovetskiy|RU|Sovetskiy
SEK|Srednekolymsk|RU|Srednekolymsk
STW|Stavropol|RU|Stavropol Shpakovskoye
IGT|Sunzha|RU|Magas
SCW|Syktyvkar|RU|Syktyvkar
IKS|Tiksi|RU|Tiksi
RMZ|Tobolsk|RU|Tobolsk Remezov
UCT|Ukhta|RU|Ukhta
ULV|Ulyanovsk|RU|Ulyanovsk Baratayevka
URJ|Uray|RU|Uray
USK|Usinsk|RU|Usinsk
UKX|Ust-Kut|RU|Ust-Kut
USR|Ust-Nera|RU|Ust-Nera
VAQ|Vanavara|RU|Vanavara
VUS|Velikiy Ustyug|RU|Velikiy Ustyug
VYI|Vilyuisk|RU|Vilyuisk
VKT|Vorkuta|RU|Vorkuta
VOZ|Voronezh|RU|Voronezh International
PYJ|Yakutia|RU|Polyarny
EIE|Yeniseysk|RU|Yeniseysk
ZIX|Zhigansk|RU|Zhigansk
ZKP|Zyryanka|RU|Zyryanka
KME|Kamembe|RW|Kamembe
EJH|Al Wajh|SA|Al Wajh Domestic
ABT|Al-Baha|SA|King Saud Bin Abdulaziz (Al Baha)
RAE|Arar|SA|Arar Domestic
BHH|Bisha|SA|Bisha
DWD|Dawadmi|SA|Dawadmi Domestic
URY|Gurayat|SA|Gurayat Domestic
GIZ|Jizan|SA|Jizan Regional Airport / King Abdullah bin Abdulaziz
KMC|King Khaled Military City|SA|King Khaled Military City
EAM|Najran|SA|Najran Domestic
RAH|Rafha|SA|Rafha Domestic
SHW|Sharurah|SA|Sharurah Domestic
TUI|Turaif|SA|Turaif Domestic
WAE|Wadi Al Dawasir|SA|Wadi Al Dawasir Domestic
MUA|Munda|SB|Munda
PRI|Praslin Island|SC|Praslin Island
DOG|Dongola|SD|Dongola
ELF|El Fasher|SD|El Fasher
EBD|El-Obeid|SD|El-Obeid
KSL|Kassala|SD|Kassala
UYL|Nyala|SD|Nyala
AJR|Arvidsjaur|SE|Arvidsjaur
BLE|Borlange|SE|Dala
GEV|Gällivare|SE|Gällivare
HAD|Halmstad|SE|Halmstad
JKG|Jönköping|SE|Jönköping
KLR|Kalmar|SE|Kalmar
KSD|Karlstad|SE|Karlstad
LYC|Lycksele|SE|Lycksele
MXX|Mora|SE|Mora
NRK|Norrköping|SE|Norrköping
KRF|Nyland|SE|Kramfors-Sollefteå Höga Kusten
RNB|Ronneby|SE|Ronneby
SFT|Skellefteå|SE|Skellefteå
BMA|Stockholm|SE|Stockholm-Bromma
SDL|Sundsvall/ Härnösand|SE|Sundsvall-Härnösand
TYF|Torsby|SE|Torsby
THN|Trollhättan|SE|Trollhättan-Vänersborg
VHM|Vilhelmina|SE|Vilhelmina South Lapland
VXO|Växjö|SE|Växjö Kronoberg
AGH|Ängelholm|SE|Ängelholm-Helsingborg
ORB|Örebro|SE|Örebro
OER|Örnsköldsvik|SE|Örnsköldsvik
OSD|Östersund|SE|Åre Östersund
XSP|Seletar|SG|Seletar
ASI|Cat Hill|SH|RAF Ascension Island
HLE|Jamestown|SH|Saint Helena International
MBX|Maribor|SI|Maribor Edvard Rusjan
KSC|Košice|SK|Košice International
TAT|Poprad|SK|Poprad-Tatry
SLD|Sliač|SK|Sliač
CSK|Cap Skirring|SN|Cap Skirring
ZIG|Ziguinchor|SN|Ziguinchor
BBO|Berbera|SO|Berbera
MAK|Malakal|SS|Malakal International
WUU|Wau|SS|Wau
PCP|São Tomé & Príncipe|ST|Principe
ILS|San Salvador|SV|Ilopango International
LTK|Latakia|SY|Latakia International
KAC|Qamishli|SY|Qamishli International
GDT|Cockburn Town|TC|JAGS McCartney International
NCA|North Caicos|TC|North Caicos
XSC|South Caicos|TC|South Caicos
BFV|Buriram|TH|Buri Ram
CJM|Chumphon|TH|Chumphon
HHQ|Hua Hin|TH|Hua Hin
KKC|Khon Kaen|TH|Khon Kaen
TDX|Laem Ngop|TH|Trat
LPT|Lampang|TH|Lampang
LOE|Loei|TH|Loei
HGN|Mae Hong Son|TH|Mae Hong Son
MAQ|Mae Sot|TH|Mae Sot
KOP|Nakhon Phanom|TH|Nakhon Phanom
NST|Nakhon Si Thammarat|TH|Nakhon Si Thammarat
NNT|Nan|TH|Nan
NAW|Narathiwat|TH|Narathiwat
PHY|Phetchabun|TH|Phetchabun
PHS|Phitsanulok|TH|Phitsanulok
UNN|Ranong|TH|Ranong
ROI|Roi Et|TH|Roi Et
SNO|Sakon Nakhon|TH|Sakon Nakhon
THS|Sukhothai|TH|Sukhothai
URT|Surat Thani|TH|Surat Thani
PXR|Surin|TH|Surin
TST|Trang|TH|Trang
UBP|Ubon Ratchathani|TH|Ubon Ratchathani
BCH|Baucau|TL|Baucau
UAI|Suai|TL|Commander in Chief of FALINTIL, Kay Rala Xanana Gusmão, International
BKN|Balkanabat|TM|Balkanabat International
MYP|Mary|TM|Mary International
KRW|Turkmenbaşy|TM|Turkmenbaşy International
NBE|Enfidha|TN|Enfidha - Hammamet International
MIR|Monastir|TN|Monastir Habib Bourguiba International
SFA|Sfax|TN|Sfax Thyna International
TBJ|Tabarka|TN|Tabarka-Aïn Draham International
TOE|Tozeur|TN|Tozeur Nefta International
HPA|Lifuka|TO|Lifuka Island
ADF|Adıyaman|TR|Adıyaman
KZR|Altıntaş|TR|Zafer
MZH|Amasya|TR|Amasya Merzifon
HTY|Antakya|TR|Hatay
AJI|Ağrı|TR|Ağrı
BZI|Balıkesir|TR|Balıkesir
BAL|Batman|TR|Batman
BGG|Bingöl|TR|Bingöl
DNZ|Denizli|TR|Çardak
DIY|Diyarbakır|TR|Diyarbakır
EZS|Elazığ|TR|Elazığ
ERC|Erzincan|TR|Erzincan
ERZ|Erzurum|TR|Erzurum International
GZP|Gazipaşa|TR|Gazipaşa-Alanya
YKO|Hakkari|TR|Hakkari Yüksekova
ISE|Isparta|TR|Süleyman Demirel International
IGD|Iğdır|TR|Iğdır
KCM|Kahramanmaraş|TR|Kahramanmaraş
KSY|Kars|TR|Kars
KFS|Kastamonu|TR|Kastamonu
MLX|Malatya|TR|Malatya Erhaç
MQM|Mardin|TR|Mardin
MSR|Muş|TR|Muş
OGU|Ordu|TR|Ordu–Giresun
RZV|Rize|TR|Rize–Artvin
SZF|Samsun|TR|Samsun-Çarşamba
NOP|Sinop|TR|Sinop
VAS|Sivas|TR|Sivas Nuri Demirağ
TJK|Tokat|TR|Tokat
TZX|Trabzon|TR|Trabzon International
VAN|Van|TR|Van Ferit Melen
YEI|Yenişehir|TR|Bursa Yenişehir
ONQ|Zonguldak|TR|Zonguldak Çaycuma
CKZ|Çanakkale|TR|Çanakkale
TEQ|Çorlu|TR|Tekirdağ Çorlu
NKT|Şırnak|TR|Şırnak Şerafettin Elçi
FUN|Funafuti|TV|Funafuti International
MFK|Matsu (Beigan)|TW|Matsu Beigan
LZN|Matsu (Nangan)|TW|Matsu Nangan
KYD|Orchid Island|TW|Lanyu
KNH|Shang-I|TW|Kinmen
CYI|Shuishang|TW|Chiayi
TTT|Taitung City|TW|Taitung
ARK|Arusha|TZ|Arusha
DOD|Dodoma|TZ|Dodoma
MBI|Mbeya|TZ|Songwe
MYW|Mtwara|TZ|Mtwara
TGT|Tanga|TZ|Tanga
RUA|Arua|UG|Arua
ULU|Gulu|UG|Gulu
KHX|Kihihi|UG|Savannah
SRT|Soroti|UG|Soroti
AWK|Wake Island|UM|Wake Island
ABR|Aberdeen|US|Aberdeen Regional
ABI|Abilene|US|Abilene Regional
ADK|Adak|US|Adak
CAK|Akron|US|Akron Canton Regional
ALS|Alamosa|US|San Luis Valley Regional Airport/Bergman Field
ABY|Albany|US|Southwest Georgia Regional
WKK|Aleknagik|US|Aleknagik / New
AEX|Alexandria|US|Alexandria International
ABE|Allentown/Bethlehem|US|Lehigh Valley International
AIA|Alliance|US|Alliance Municipal
APN|Alpena|US|Alpena County Regional
AOO|Altoona|US|Altoona Blair County
AMA|Amarillo|US|Rick Husband Amarillo International
ABL|Ambler|US|Ambler
AKP|Anaktuvuk Pass|US|Anaktuvuk Pass
MRI|Anchorage|US|Merrill Field
ANI|Aniak|US|Aniak
ANV|Anvik|US|Anvik
ATW|Appleton|US|Appleton International
ACV|Arcata/Eureka|US|California Redwood Coast-Humboldt County
ARC|Arctic Village|US|Arctic Village
AVL|Asheville|US|Asheville Regional
ASE|Aspen|US|Aspen-Pitkin County Airport (Sardy Field)
PDK|Atlanta|US|DeKalb Peachtree
ACY|Atlantic City|US|Atlantic City International
ATK|Atqasuk|US|Atqasuk Edward Burnell Sr Memorial
AGS|Augusta|US|Augusta Regional At Bush Field
AUG|Augusta|US|Augusta State
BFL|Bakersfield|US|Meadows Field
BGR|Bangor|US|Bangor International
BHB|Bar Harbor|US|Hancock County-Bar Harbor
BTI|Barter Island|US|Barter Island Long Range Radar Station
BTR|Baton Rouge|US|Baton Rouge Metropolitan
BPT|Beaumont/Port Arthur|US|Jack Brooks Regional
BKW|Beaver|US|Raleigh County Memorial
BED|Bedford|US|Laurence G Hanscom Field
BLV|Belleville|US|Scott AFB/Midamerica
BLI|Bellingham|US|Bellingham International
BET|Bethel|US|Bethel
BIL|Billings|US|Billings Logan International
BGM|Binghamton|US|Greater Binghamton/Edwin A Link field
BIH|Bishop|US|Eastern Sierra Regional
BIS|Bismarck|US|Bismarck Municipal
BMI|Bloomington/Normal|US|Central Illinois Regional Airport at Bloomington-Normal
TRI|Blountville|US|Tri-Cities Regional TN/VA
BLD|Boulder City|US|Boulder City Municipal
BZN|Bozeman|US|Bozeman Yellowstone International
BFD|Bradford|US|Bradford Regional
BRD|Brainerd|US|Brainerd Lakes Regional
BKG|Branson|US|Branson
CKB|Bridgeport|US|North Central West Virginia
BRO|Brownsville|US|Brownsville South Padre Island International
BQK|Brunswick|US|Brunswick Golden Isles
BRL|Burlington|US|Southeast Iowa Regional
BTV|Burlington|US|Patrick Leahy Burlington International
BTM|Butte|US|Bert Mooney
CGI|Cape Girardeau|US|Cape Girardeau Regional
LUR|Cape Lisburne|US|Cape Lisburne LRRS
CNM|Carlsbad|US|Cavern City Air Terminal
CLD|Carlsbad|US|McClellan-Palomar
CPR|Casper|US|Casper-Natrona County International
CDC|Cedar City|US|Cedar City Regional
CID|Cedar Rapids|US|The Eastern Iowa
CDR|Chadron|US|Chadron Municipal
CRW|Charleston|US|Yeager
CHO|Charlottesville|US|Charlottesville Albemarle
CHA|Chattanooga|US|Chattanooga Metropolitan Airport (Lovell Field)
CYS|Cheyenne|US|Cheyenne Regional Jerry Olson Field
RFD|Chicago/Rockford|US|Chicago Rockford International
LUK|Cincinnati|US|Cincinnati Municipal Airport Lunken Field
CVN|Clovis|US|Clovis Municipal
COD|Cody|US|Yellowstone Regional
CDB|Cold Bay|US|Cold Bay
CLL|College Station|US|Easterwood Field
CAE|Columbia|US|Columbia Metropolitan
COU|Columbia|US|Columbia Regional
CSG|Columbus|US|Columbus
LCK|Columbus|US|Rickenbacker International
GTR|Columbus/W Point/Starkville|US|Golden Triangle Regional
CCR|Concord|US|Buchanan Field
USA|Concord|US|Concord-Padgett Regional
CDV|Cordova|US|Merle K (Mudhole) Smith
CRP|Corpus Christi|US|Corpus Christi International
CEZ|Cortez|US|Cortez Municipal
CEC|Crescent City|US|Jack Mc Namara Field
DAY|Dayton|US|James M. Cox Dayton International
DAB|Daytona Beach|US|Daytona Beach International
SCC|Deadhorse|US|Deadhorse
DEC|Decatur|US|Decatur
DRG|Deering|US|Deering
BJC|Denver|US|Rocky Mountain Metropolitan
DSI|Destin|US|Destin Executive
DVL|Devils Lake|US|Devils Lake Regional
DIK|Dickinson|US|Dickinson Theodore Roosevelt Regional
DLG|Dillingham|US|Dillingham
DDC|Dodge City|US|Dodge City Regional
DHN|Dothan|US|Dothan Regional
DOV|Dover|US|Dover Civil Air Terminal/Dover Air Force Base
DUJ|Dubois|US|DuBois Regional
DBQ|Dubuque|US|Dubuque Regional
DLH|Duluth|US|Duluth International
DRO|Durango|US|Durango La Plata County
EGE|Eagle|US|Eagle County Regional
ESD|Eastsound|US|Orcas Island
EAU|Eau Claire|US|Chippewa Valley Regional
EGX|Egegik|US|Egegik
ELD|El Dorado|US|South Arkansas Regional Airport at Goodwin Field
EKO|Elko|US|Elko Regional
ELM|Elmira/Corning|US|Elmira Corning Regional
EMK|Emmonak|US|Emmonak
ERI|Erie|US|Erie International Tom Ridge Field
ESC|Escanaba|US|Delta County
EUG|Eugene|US|Eugene
EVV|Evansville|US|Evansville Regional
PAE|Everett|US|Seattle Paine Field International
TTN|Ewing Township|US|Trenton Mercer
FAI|Fairbanks|US|Fairbanks International
FAR|Fargo|US|Hector International
FAY|Fayetteville|US|Fayetteville Regional Airport - Grannis Field
XNA|Fayetteville/Springdale/Rogers|US|Northwest Arkansas National
FLG|Flagstaff|US|Flagstaff Pulliam
FNT|Flint|US|Bishop International
FLO|Florence|US|Florence Regional
GRK|Fort Cavazos|US|Killeen Regional Airport / Robert Gray Army
FOD|Fort Dodge|US|Fort Dodge Regional
TBN|Fort Leonard Wood|US|Waynesville-St. Robert Regional Airport-Forney Field
FSM|Fort Smith|US|Fort Smith Regional
FWA|Fort Wayne|US|Fort Wayne International
FTW|Fort Worth|US|Fort Worth Meacham International
FYU|Fort Yukon|US|Fort Yukon
MBS|Freeland|US|MBS International
FRD|Friday Harbor|US|Friday Harbor
GNV|Gainesville|US|Gainesville Regional
GAL|Galena|US|Edward G. Pitka Sr
GUP|Gallup|US|Gallup Municipal
GAM|Gambell|US|Gambell
GCK|Garden City|US|Garden City Regional
GYY|Gary|US|Gary/Chicago International
GCC|Gillette|US|Northeast Wyoming Regional
GGW|Glasgow|US|Glasgow Valley County Airport Wokal Field
GDV|Glendive|US|Dawson Community
GCN|Grand Canyon - Tusayan|US|Grand Canyon National Park
GFK|Grand Forks|US|Grand Forks International
GRI|Grand Island|US|Central Nebraska Regional
GJT|Grand Junction|US|Grand Junction Regional
GTF|Great Falls|US|Great Falls International
GRB|Green Bay|US|Austin Straubel International
GLH|Greenville|US|Mid Delta Regional
PGV|Greenville|US|Pitt-Greenville
GSP|Greenville/Greer/Spartanburg|US|Greenville-Spartanburg International
GPT|Gulfport|US|Gulfport Biloxi International
GKN|Gulkana|US|Gulkana
GUC|Gunnison|US|Gunnison Crested Butte Regional
GST|Gustavus|US|Gustavus
MQT|Gwinn|US|Marquette Sawyer Regional
HGR|Hagerstown|US|Hagerstown Regional Richard A Henson Field
SUN|Hailey|US|Friedman Memorial
HNS|Haines|US|Haines
HNM|Hana|US|Hana
CMX|Hancock|US|Houghton County Memorial
HRL|Harlingen|US|Valley International
MDT|Harrisburg|US|Harrisburg International
HRO|Harrison|US|Boone County
HVR|Havre|US|Havre City County
HHR|Hawthorne|US|Jack Northrop Field Hawthorne Municipal
HDN|Hayden|US|Yampa Valley
HYS|Hays|US|Hays Regional
HLN|Helena|US|Helena Regional
HIB|Hibbing|US|Range Regional
ITO|Hilo|US|Hilo International
HHH|Hilton Head Island|US|Hilton Head
HOB|Hobbs|US|Lea County Regional
HCR|Holy Cross|US|Holy Cross
HOM|Homer|US|Homer
HOT|Hot Springs|US|Memorial Field
HTS|Huntington|US|Tri-State Airport / Milton J. Ferguson Field
HSV|Huntsville|US|Huntsville International
HSL|Huslia|US|Huslia
HYA|Hyannis|US|Cape Cod Gateway
IDA|Idaho Falls|US|Idaho Falls Regional
ILI|Iliamna|US|Iliamna
IPL|Imperial|US|Imperial County
INL|International Falls|US|Falls International
ISP|Islip|US|Long Island MacArthur
ITH|Ithaca|US|Ithaca Tompkins Regional
JAC|Jackson|US|Jackson Hole
JAN|Jackson|US|Jackson-Medgar Wiley Evers International
MKL|Jackson|US|McKellar-Sipes Regional
JMS|Jamestown|US|Jamestown Regional
JST|Johnstown|US|John Murtha Johnstown Cambria County
JBR|Jonesboro|US|Jonesboro Municipal
JLN|Joplin|US|Joplin Regional
JNU|Juneau|US|Juneau International
AZO|Kalamazoo|US|Kalamazoo/Battle Creek International
FCA|Kalispell|US|Glacier Park International
MKK|Kaunakakai|US|Molokai
EAR|Kearney|US|Kearney Regional
ENA|Kenai|US|Kenai Municipal
KTN|Ketchikan|US|Ketchikan International
EYW|Key West|US|Key West International
IAN|Kiana|US|Bob Baker Memorial
CIU|Kincheloe|US|Chippewa County International
AKN|King Salmon|US|King Salmon
IMT|Kingsford|US|Ford
IRK|Kirksville|US|Kirksville Regional
KLW|Klawock|US|Klawock
ADQ|Kodiak|US|Kodiak
OTZ|Kotzebue|US|Ralph Wien Memorial
LSE|La Crosse|US|La Crosse Regional
LFT|Lafayette|US|Lafayette Regional
JHM|Lahaina|US|Kapalua
LCH|Lake Charles|US|Lake Charles Regional
HII|Lake Havasu City|US|Lake Havasu City
LAL|Lakeland|US|Lakeland Linder International
LNY|Lanai City|US|Lanai
LNS|Lancaster|US|Lancaster
LAN|Lansing|US|Capital Region International
LAR|Laramie|US|Laramie Regional
LRD|Laredo|US|Laredo International
LRU|Las Cruces|US|Las Cruces International
LBE|Latrobe|US|Arnold Palmer Regional
LAW|Lawton|US|Lawton Fort Sill Regional
LEB|Lebanon|US|Lebanon Municipal
LWB|Lewisburg|US|Greenbrier Valley
LWS|Lewiston|US|Lewiston Nez Perce County
LEX|Lexington|US|Blue Grass
LBL|Liberal|US|Liberal Mid-America Regional
LNK|Lincoln|US|Lincoln
LIT|Little Rock|US|Bill & Hillary Clinton National Airport/Adams Field
GGG|Longview|US|East Texas Regional
LBB|Lubbock|US|Lubbock Preston Smith International
LYH|Lynchburg|US|Lynchburg Regional Airport - Preston Glenn Field
MCN|Macon|US|Middle Georgia Regional
MSN|Madison|US|Dane County Regional Truax Field
MMH|Mammoth Lakes|US|Mammoth Yosemite
MHT|Manchester|US|Manchester-Boston Regional
MHK|Manhattan|US|Manhattan Regional
MWA|Marion|US|Veterans Airport of Southern Illinois
MCW|Mason City|US|Mason City Municipal
MSS|Massena|US|Massena International Airport Richards Field
MFE|McAllen|US|McAllen Miller International
MYL|McCall|US|McCall Municipal
MCK|McCook|US|McCook Ben Nelson Regional
MCG|McGrath|US|McGrath
MFR|Medford|US|Rogue Valley International-Medford
MYU|Mekoryuk|US|Mekoryuk
MLB|Melbourne|US|Melbourne Orlando International
MCE|Merced|US|Merced Regional Macready Field
MEI|Meridian|US|Key Field / Meridian Regional
AZA|Mesa|US|Mesa Gateway
OPF|Miami|US|Miami-Opa Locka Executive
MGC|Michigan City|US|Michigan City Municipal
MAF|Midland|US|Midland International Air and Space Port
MWL|Mineral Wells|US|Mineral Wells Regional
MOT|Minot|US|Minot International
MSO|Missoula|US|Missoula Montana
CNY|Moab|US|Canyonlands Regional
MOB|Mobile|US|Mobile Regional
MLI|Moline|US|Quad City International
MLU|Monroe|US|Monroe Regional
MRY|Monterey|US|Monterey Regional
MGM|Montgomery|US|Montgomery Regional (Dannelly Field)
MTJ|Montrose|US|Montrose Regional
MGW|Morgantown|US|Morgantown Municipal Airport Walter L. (Bill) Hart Field
PIB|Moselle|US|Hattiesburg Laurel Regional
CWA|Mosinee|US|Central Wisconsin
MSL|Muscle Shoals|US|Northwest Alabama Regional
MKG|Muskegon|US|Muskegon County
ACK|Nantucket|US|Nantucket Memorial
EWB|New Bedford|US|New Bedford Regional
EWN|New Bern|US|Coastal Carolina Regional
HVN|New Haven|US|Tweed New Haven
SWF|Newburgh|US|New York Stewart International
NPT|Newport|US|Newport State
PHF|Newport News|US|Newport News Williamsburg International
IAG|Niagara Falls|US|Niagara Falls International
OME|Nome|US|Nome
OTH|North Bend|US|Southwest Oregon Regional
LBF|North Platte|US|North Platte Regional Airport Lee Bird Field
ORT|Northway|US|Northway
NUI|Nuiqsut|US|Nuiqsut
OCE|Ocean City|US|Ocean City Municipal
OGD|Ogden|US|Ogden Hinckley
OGS|Ogdensburg|US|Ogdensburg International
OLM|Olympia|US|Olympia Regional
OWB|Owensboro|US|Owensboro Daviess County
PAH|Paducah|US|Barkley Regional
PGA|Page|US|Page Municipal
ECP|Panama City Beach|US|Northwest Florida Beaches International
PKB|Parkersburg (Williamstown)|US|Mid Ohio Valley Regional
PSC|Pasco|US|Tri Cities
PLN|Pellston|US|Pellston Regional Airport of Emmet County
PDT|Pendleton|US|Eastern Oregon Regional Airport at Pendleton
PIA|Peoria|US|General Wayne A. Downing Peoria International
PSG|Petersburg|US|Petersburg James A Johnson
PIR|Pierre|US|Pierre Regional
PTU|Platinum|US|Platinum
PBG|Plattsburgh|US|Plattsburgh International
PIH|Pocatello|US|Pocatello Regional
PIZ|Point Lay|US|Point Lay LRRS
PTH|Port Heiden|US|Port Heiden
PSM|Portsmouth|US|Portsmouth International Airport at Pease
PRC|Prescott|US|Prescott Regional Airport - Ernest A. Love Field
PQI|Presque Isle|US|Presque Isle International
PVU|Provo|US|Provo Municipal
PUB|Pueblo|US|Pueblo Memorial
PUW|Pullman|US|Pullman-Moscow Regional
PGD|Punta Gorda|US|Punta Gorda
UIN|Quincy|US|Quincy Regional Airport Baldwin Field
RAP|Rapid City|US|Rapid City Regional
RDD|Redding|US|Redding Municipal
RDM|Redmond|US|Roberts Field
RHI|Rhinelander|US|Rhinelander Oneida County
OAJ|Richlands|US|Albert J Ellis
RIW|Riverton|US|Central Wyoming Regional
ROA|Roanoke|US|Roanoke–Blacksburg Regional
RST|Rochester|US|Rochester International
RKS|Rock Springs|US|Southwest Wyoming Regional
RKD|Rockland|US|Knox County Regional
ROW|Roswell|US|Roswell Air Center
RBY|Ruby|US|Ruby
RUT|Rutland|US|Rutland - Southern Vermont Regional
STC|Saint Cloud|US|Saint Cloud Regional
SLE|Salem|US|Salem-Willamette Valley Airport/McNary Field
SLN|Salina|US|Salina Municipal
SBY|Salisbury|US|Salisbury Ocean City Wicomico Regional
SMN|Salmon|US|Lemhi County
SJT|San Angelo|US|San Angelo Regional Mathis Field
SQL|San Carlos|US|San Carlos
SBP|San Luis Obispo|US|San Luis County Regional
SDP|Sand Point|US|Sand Point
SBA|Santa Barbara|US|Santa Barbara Municipal
SAF|Santa Fe|US|Santa Fe Municipal
SMX|Santa Maria|US|Santa Maria Public Airport Captain G Allan Hancock Field
STS|Santa Rosa|US|Charles M. Schulz Sonoma County
SLK|Saranac Lake|US|Adirondack Regional
SVA|Savoonga|US|Savoonga
CMI|Savoy|US|University of Illinois Willard
BFF|Scottsbluff|US|Western Neb. Rgnl/William B. Heilig
BFI|Seattle|US|King County International Airport - Boeing Field
SHR|Sheridan|US|Sheridan County
SOW|Show Low|US|Show Low Regional
SHV|Shreveport|US|Shreveport Regional
SDY|Sidney|US|Sidney - Richland Regional
SVC|Silver City|US|Grant County
SUX|Sioux City|US|Sioux Gateway Airport / Brigadier General Bud Day Field
FSD|Sioux Falls|US|Sioux Falls Regional
SIT|Sitka|US|Sitka Rocky Gutierrez
SBN|South Bend|US|South Bend International
SGF|Springfield|US|Springfield Branson National
SPI|Springfield|US|Abraham Lincoln Capital
UST|St Augustine|US|Northeast Florida Regional
SGU|St George|US|St George Regional
STG|St George|US|St George
SNP|St Paul Island|US|St Paul Island
SCE|State College|US|State College Regional
SWO|Stillwater|US|Stillwater Regional
SCK|Stockton|US|Stockton Metropolitan
TIW|Tacoma|US|Tacoma Narrows
TLH|Tallahassee|US|Tallahassee International
TSM|Taos|US|Taos Regional
TEX|Telluride|US|Telluride Regional
TEB|Teterboro|US|Teterboro
TXK|Texarkana|US|Texarkana Regional Airport (Webb Field)
TVF|Thief River Falls|US|Thief River Falls Regional
TOL|Toledo|US|Eugene F. Kranz Toledo Express
TVC|Traverse City|US|Cherry Capital
TKF|Truckee|US|Truckee Tahoe
TUP|Tupelo|US|Tupelo Regional
TWF|Twin Falls|US|Joslin Field Magic Valley Regional
TYR|Tyler|US|Tyler Pounds Regional
UNK|Unalakleet|US|Unalakleet
DUT|Unalaska|US|Tom Madsen (Dutch Harbor)
UTO|Utopia Creek|US|Indian Mountain LRRS
BRW|Utqiaġvik|US|Wiley Post Will Rogers Memorial
VDZ|Valdez|US|Valdez Pioneer Field
VLD|Valdosta|US|Valdosta Regional
VPS|Valparaiso|US|Destin-Fort Walton Beach
VEL|Vernal|US|Vernal Regional
VRB|Vero Beach|US|Vero Beach Regional
VCT|Victoria|US|Victoria Regional
ACT|Waco|US|Waco Regional
MUE|Waimea (Kamuela)|US|Waimea Kohala
AIN|Wainwright|US|Wainwright
ALW|Walla Walla|US|Walla Walla Regional
ALO|Waterloo|US|Waterloo Regional
ART|Watertown|US|Watertown International
ATY|Watertown|US|Watertown Regional
EAT|Wenatchee|US|Pangborn Memorial
LAF|West Lafayette|US|Purdue University
WYS|West Yellowstone|US|Yellowstone
WST|Westerly|US|Westerly State
SHD|Weyers Cave|US|Shenandoah Valley Regional
HPN|White Plains|US|Westchester County
ICT|Wichita|US|Wichita Dwight D. Eisenhower National
SPS|Wichita Falls|US|Wichita Falls Municipal Airport / Sheppard Air Force Base
AVP|Wilkes-Barre/Scranton|US|Wilkes-Barre/Scranton International
IPT|Williamsport|US|Williamsport Regional
XWA|Williston|US|Williston Basin International
ILG|Wilmington|US|Wilmington
ILM|Wilmington|US|Wilmington International
OLF|Wolf Point|US|L M Clayton
ORH|Worcester|US|Worcester Regional
WRG|Wrangell|US|Wrangell
YKM|Yakima|US|Yakima Air Terminal McAllister Field
YAK|Yakutat|US|Yakutat
YUM|Yuma|US|Yuma International Airport / Marine Corps Air Station Yuma
PDP|Punta del Este|UY|Capitan Corbeta CA Curbelo International
RVY|Rivera/Santana do Livramento|UY|Pres. Gral. Óscar D. Gestido Binational
AZN|Andijan|UZ|Andijan International
FEG|Fergana|UZ|Fergana International
NVI|Navoi|UZ|Navoi International
TVT|Tashkent|UZ|Tashkent-Khumo International
TMJ|Termez|UZ|Termez
OMN|Zomin|UZ|Zomin
BQU|Bequia|VC|J F Mitchell
CIW|Canouan|VC|Canouan
MQS|Lovell|VC|Mustique
UNI|Union Island|VC|Union Island International
BNS|Barinas|VE|Barinas
CAJ|Canaima|VE|Canaima
CUP|Carúpano|VE|General Francisco Bermúdez
CZE|Coro|VE|José Leonardo Chirinos
CUM|Cumaná|VE|Antonio José de Sucre
SOM|El Tigre|VE|San Tomé
VIG|El Vigía|VE|Juan Pablo Pérez Alfonso
MUN|Maturín|VE|José Tadeo Monagas International
LSP|Paraguaná|VE|Josefa Camejo International
SVZ|San Antonio del Tachira|VE|Juan Vicente Gómez International
SNV|Santa Elena de Uairén|VE|Santa Elena de Uairén
STD|Santo Domingo|VE|Mayor Buenaventura Vivas International
VLV|Valera|VE|Dr. Antonio Nicolás Briceño
VIJ|Spanish Town|VG|Virgin Gorda
STX|Christiansted|VI|Henry E. Rohlsen
BMV|Buon Ma Thuot|VN|Buon Ma Thuot
CAH|Ca Mau City|VN|Cà Mau
VCS|Con Dao|VN|Con Dao
DLI|Da Lat|VN|Lien Khuong
DIN|Dien Bien Phu|VN|Dien Bien Phu
VDH|Dong Hoi|VN|Dong Hoi
PXU|Pleiku|VN|Pleiku
UIH|Quy Nohn|VN|Phu Cat
VKG|Rach Gia|VN|Rach Gia
TBB|Tuy Hoa|VN|Dong Tac
VDO|Van Don|VN|Van Don International
VII|Vinh|VN|Vinh
SON|Luganville|VU|Santo Pekoa International
TAH|Tanna Island|VU|Whitegrass
AAY|Al Ghaydah|YE|Al Ghaydah International
SCT|Mori|YE|Socotra
TAI|Taiz|YE|Taiz International
HDS|Hoedspruit|ZA|Eastgate Airport / Air Force Base Hoedspruit
MBD|Mafeking|ZA|Mmabatho International
MGH|Margate|ZA|Margate
MZQ|Mkuze|ZA|Mkuze
UTT|Mthatha|ZA|K. D. Matanzima
PHW|Phalaborwa|ZA|Hendrik Van Eck
PZB|Pietermaritzburg|ZA|Pietermaritzburg
RCB|Richards Bay|ZA|Richards Bay
SIS|Sishen|ZA|Sishen
SZK|Skukuza|ZA|Skukuza
UTN|Upington|ZA|Upington
KAB|Kariba|ZW|Kariba
ZDY|Delma Island|AE|Delma
FBD|Fayzabad|AF|Fayzabad
GGS|Gobernador Gregores|AR|Gobernador Gregores
RYO|Rio Turbio|AR|28 de Noviembre
OES|San Antonio Oeste|AR|Antoine de Saint Exupéry
FTI|Fitiuta Village|AS|Fitiuta
OFU|Ofu|AS|Ofu
AUU|Aurukun|AU|Aurukun
BDD|Badu Island|AU|Badu Island
ABM|Bamaga|AU|Northern Peninsula
BXG|Bendigo|AU|Bendigo
GIC|Boigu Island|AU|Boigu Island
BUC|Burketown|AU|Burketown
BQB|Busselton|AU|Busselton Margaret River Regional
CKW|Christmas Creek Mine|AU|Christmas Creek
CNC|Coconut Island|AU|Coconut Island
GYZ|Cosmo Newbery|AU|Gruyere
NLF|Darnley Island|AU|Darnley Island
DMD|Doomadgee|AU|Doomadgee
HGD|Hughenden|AU|Hughenden
JCK|Julia Creek|AU|Julia Creek
KAX|Kalbarri|AU|Kalbarri
KFG|Kalkgurung|AU|Kalkgurung
KQR|Karara|AU|Karara
KRB|Karumba|AU|Karumba
KUG|Kubin Island|AU|Kubin Island
HOK|Lajamanu|AU|Hooker Creek
LEL|Lake Evella|AU|Lake Evella
LVO|Laverton|AU|Laverton
LDH|Lord Howe Island|AU|Lord Howe Island
UBB|Mabuiag Island|AU|Mabuiag Island
MCV|McArthur River Mine|AU|McArthur River Mine
MGT|Milingimbi Island|AU|Milingimbi
ONG|Mornington Island|AU|Mornington Island
PXH|Mount Eba|AU|Prominent Hill
MYI|Murray Island|AU|Murray Island
OLP|Olympic Dam|AU|Olympic Dam
PMK|Palm Island|AU|Palm Island
EDR|Pormpuraaw|AU|Pormpuraaw
RAM|Ramingining|AU|Ramingining
RCM|Richmond|AU|Richmond
SBR|Saibai Island|AU|Saibai Island
SGO|St George|AU|St George
SYU|Sue Islet|AU|Warraber Island
FLS|Whitemark|AU|Flinders Island
XMY|Yam Island|AU|Yam Island
OKR|Yorke Island|AU|Yorke Island
LLK|Lankaran|AZ|Lankaran International
KRE|Kirundo|BI|Kirundo
CCA|Chimore|BO|Chimore
PUR|Puerto Rico/Manuripi|BO|Puerto Rico
RBQ|Rurrenabaque|BO|Rurrenabaque
GGF|Almeirim|BR|Almeirim
BAZ|Barcelos|BR|Barcelos
BRA|Barreiras|BR|Dom Ricardo Weberberger
BYO|Bonito|BR|Bonito
RBB|Borba|BR|Borba
BVS|Breves|BR|Breves
CFB|Cabo Frio|BR|Cabo Frio
OAL|Cacoal|BR|Cacoal
CJZ|Cajazeiras|BR|Pedro Vieira Moreira
CLV|Caldas Novas|BR|Nelson Ribeiro Guimarães
CEL|Canela|BR|Canela
CAF|Carauari|BR|Carauari
CAU|Caruaru|BR|Caruaru
FBE|Francisco Beltrão|BR|Paulo Abdala
GUZ|Guarapari|BR|Guarapari
GGJ|Guaíra|BR|Guaíra
JJG|Jaguaruna|BR|Humberto Ghizzo Bortoluzzi Regional
JPR|Ji-Paraná|BR|Ji-Paraná
JDO|Juazeiro do Norte|BR|Orlando Bezerra de Menezes
LEC|Lençóis|BR|Coronel Horácio de Mattos
LBR|Lábrea|BR|Lábrea
PYT|Paracatu|BR|Pedro Rabelo de Souza
JPE|Paragominas|BR|Nagib Demachki
PTO|Pato Branco|BR|Juvenal Loureiro Cardoso
OPP|Salinópolis|BR|Salinópolis
IRZ|Santa Isabel do Rio Negro|BR|Tapuruquara
SRA|Santa Rosa|BR|Luis Alberto Lehr
SET|Serra Talhada|BR|Santa Magalhães
OPS|Sinop|BR|Presidente João Batista Figueiredo
SOD|Sorocaba|BR|Sorocaba
SMT|Sorriso|BR|Adolino Bedin Regional
TGQ|Tangará da Serra|BR|Tangará da Serra
TOW|Toledo|BR|Toledo - Luiz Dalcanale Filho Municipal
TJL|Três Lagoas|BR|Plínio Alarcom
UMU|Umuarama|BR|Orlando de Carvalho
UNA|Una|BR|Una-Comandatuba
UVI|União da Vitória|BR|José Cleto
VAL|Valença|BR|Valença
BUT|Jakar|BT|Bathpalathang
YON|Yongphulla|BT|Yongphulla
SWX|Shakawe|BW|Shakawe
BGK|Big Creek|BZ|Big Creek
INB|Independence|BZ|Independence
ORZ|Orange Walk|BZ|H.E Alfredo Martinez (Tower Hill)
PND|Punta Gorda|BZ|Punta Gorda
LAK|Aklavik|CA|Aklavik/Freddie Carmichael
AKV|Akulivik|CA|Akulivik
YAL|Alert Bay|CA|Alert Bay
YAX|Angling Lake|CA|Wapekeka
YAB|Arctic Bay|CA|Arctic Bay
YEK|Arviat|CA|Arviat
YAT|Attawapiskat|CA|Attawapiskat
YPJ|Aupaluk|CA|Aupaluk
XBE|Bearskin Lake|CA|Bearskin Lake
YBV|Berens River|CA|Berens River
YTL|Big Trout Lake|CA|Big Trout Lake
YBI|Black Tickle|CA|Black Tickle
YDV|Bloodvein River|CA|Bloodvein River
YBT|Brochet|CA|Brochet
YRF|Cartwright|CA|Cartwright
YAC|Cat Lake|CA|Cat Lake
YHG|Charlottetown|CA|Charlottetown
YCS|Chesterfield Inlet|CA|Chesterfield Inlet
YHR|Chevery|CA|Chevery
YKU|Chisasibi|CA|Chisasibi
ZUM|Churchill Falls|CA|Churchill Falls
YCY|Clyde River|CA|Clyde River
YCK|Colville Lake|CA|Tommy Kochon
YCR|Cross Lake|CA|Cross Lake (Charlie Sinclair Memorial)
YDL|Dease Lake|CA|Dease Lake
YVZ|Deer Lake|CA|Deer Lake
YWJ|Déline|CA|Déline
ZEM|Eastmain River|CA|Eastmain River
YFO|Flin Flon|CA|Flin Flon
ZFD|Fond-du-Lac|CA|Fond-du-Lac
YFA|Fort Albany|CA|Fort Albany
YGH|Fort Good Hope|CA|Fort Good Hope
YFH|Fort Hope|CA|Fort Hope
ZFM|Fort Mcpherson|CA|Fort Mcpherson
YER|Fort Severn|CA|Fort Severn
YRA|Gamètì|CA|Rae Lakes
YGX|Gillam|CA|Gillam
YHK|Gjoa Haven|CA|Gjoa Haven
YGO|Gods Lake Narrows|CA|Gods Lake Narrows
ZGI|Gods River|CA|Gods River
YGZ|Grise Fiord|CA|Grise Fiord
YHO|Hopedale|CA|Hopedale
YGT|Igloolik|CA|Igloolik
ILF|Ilford|CA|Ilford
YPH|Inukjuak|CA|Inukjuak
YIK|Ivujivik|CA|Ivujivik
XGR|Kangiqsualujjuaq|CA|Kangiqsualujjuaq (Georges River)
YWB|Kangiqsujuaq|CA|Kangiqsujuaq (Wakeham Bay)
YKG|Kangirsuk|CA|Kangirsuk
ZKE|Kashechewan|CA|Kashechewan
KEW|Keewaywin|CA|Keewaywin
YLC|Kimmirut|CA|Kimmirut
KIF|Kingfisher Lake|CA|Kingfisher Lake
YTE|Kinngait|CA|Cape Dorset
YBB|Kugaaruk|CA|Kugaaruk
YCO|Kugluktuk|CA|Kugluktuk
ZLT|La Tabatière|CA|La Tabatière
XLB|Lac Brochet|CA|Lac Brochet
YLH|Lansdowne House|CA|Lansdowne House
ZGS|Le Golfe-du-Saint-Laurent|CA|La Romaine
YSG|Lutselk'e|CA|Lutselk'e
YMN|Makkovik|CA|Makkovik
YMH|Mary's Harbour|CA|Mary's Harbour
MSA|Muskrat Dam|CA|Muskrat Dam
YDP|Nain|CA|Nain
YNP|Natuashish|CA|Natuashish
YNS|Nemiscau|CA|Nemiscau
YNO|North Spirit Lake|CA|North Spirit Lake
YNE|Norway House|CA|Norway House
YOG|Ogoki Post|CA|Ogoki Post
YOC|Old Crow|CA|Old Crow
YOH|Oxford House|CA|Oxford House
YXP|Pangnirtung|CA|Pangnirtung
YPC|Paulatuk|CA|Paulatuk (Nora Aliqatchialuk Ruben)
YPO|Peawanuck|CA|Peawanuck
YPM|Pikangikum|CA|Pikangikum
YIO|Pond Inlet|CA|Pond Inlet
YHP|Poplar Hill|CA|Poplar Hill
YHA|Port Hope Simpson|CA|Port Hope Simpson
YMP|Port McNeill|CA|Port McNeill
YSO|Postville|CA|Postville
XPK|Pukatawagan|CA|Pukatawagan
YVM|Qikiqtarjuaq|CA|Qikiqtarjuaq
YQC|Quaqtaq|CA|Quaqtaq
YRS|Red Sucker Lake|CA|Red Sucker Lake
YUT|Repulse Bay|CA|Naujaat
YRG|Rigolet|CA|Rigolet
ZRJ|Round Lake|CA|Round Lake (Weagamow Lake)
ZPB|Sachigo Lake|CA|Sachigo Lake
YSY|Sachs Harbour|CA|Sachs Harbour (David Nasogaluak Jr. Saaryuaq)
YZG|Salluit|CA|Salluit
YSK|Sanikiluaq|CA|Sanikiluaq
ZTM|Shamattawa|CA|Shamattawa
XSI|South Indian Lake|CA|South Indian Lake
YFX|St. Lewis|CA|St. Lewis (Fox Harbour)
YST|St. Theresa Point|CA|St. Theresa Point
SUR|Summer Beaver|CA|Summer Beaver
XTL|Tadoule Lake|CA|Tadoule Lake
YYH|Taloyoak|CA|Taloyoak
YTQ|Tasiujaq|CA|Tasiujaq
YZZ|Trail|CA|Trail Regional
ZFN|Tulita|CA|Tulita
ZTB|Tête-à-la-Baleine|CA|Tête-à-la-Baleine
YHI|Ulukhaktok|CA|Ulukhaktok Holman
YUD|Umiujaq|CA|Umiujaq
YBE|Uranium City|CA|Uranium City
YKQ|Waskaganish|CA|Waskaganish
YWP|Webequie|CA|Webequie
YFJ|Wekweètì|CA|Wekweètì
YNC|Wemindji|CA|Wemindji
YXN|Whale Cove|CA|Whale Cove
YLE|Whatì|CA|Whatì
YWM|Williams Harbour|CA|Williams Harbour
ZWL|Wollaston Lake|CA|Wollaston Lake
WNN|Wunnumin Lake|CA|Wunnumin Lake
BNB|Boende|CD|Boende
PFR|Ilebo|CD|Ilebo
INO|Inongo|CD|Inongo
KMN|Kamina|CD|Kamina City
AIT|Aitutaki|CK|Aitutaki
AIU|Atiu Island|CK|Enua
MHX|Manihiki Island|CK|Manihiki Island
MUK|Mauke Island|CK|Mauke
MOI|Mitiaro Island|CK|Mitiaro Island
MHC|Dalcahue|CL|Mocopulli
ZPC|Pucon|CL|Pucón
AKA|Ankang (Hanbin)|CN|Ankang Fuqiang
HQQ|Anyang|CN|Anyang Hongqiqu
ACF|Aral|CN|Aral Tarim
RHT|Badanjilin|CN|Alxa Right Banner Badanjilin
CIH|Changzhi|CN|Changzhi Wangcun
JUH|Chizhou|CN|Chizhou Jiuhuashan
CNI|Dalian (Changhai)|CN|Changhai Dachangshandao
DQA|Daqing|CN|Daqing Sartu
DAX|Dazhou (Daxian)|CN|Dachuan
KOW|Ganzhou|CN|Ganzhou Huangjin
GZG|Garzê (Garzê)|CN|Garze Gesar
HBQ|Haibei (Qilian)|CN|Haibei Qilian
HJB|Hejing|CN|Hejing Bayinbuluke
HNY|Hengyang|CN|Hengyang Nanyue
YTW|Hotan (Yutian)|CN|Yutian Wanfang
JIU|Jiujiang|CN|Jiujiang Lushan
KRY|Karamay|CN|Karamay
KCA|Kuqa|CN|Kuqa Qiuci
MXZ|Meizhou (Meixian)|CN|Meizhou Meixian Changgangji International
NAO|Nanchong (Gaoping)|CN|Nanchong Gaoping
NNY|Nanyang (Wancheng)|CN|Nanyang Jiangying
SYM|Pu'er|CN|Pu'er Simao
LLB|Qiannan (Libo)|CN|Libo
JBK|Qitai|CN|Qitai Jiangbulake
LGZ|Shannan|CN|Shannan Longzi
SHF|Shihezi|CN|Shihezi Huayuan
TCG|Tacheng|CN|Tacheng Qianquan
TVS|Tangshan (Fengrun)|CN|Tangshan Sannühe
TWC|Tumxuk|CN|Tumxuk Tangwangcheng
HLH|Ulanhot|CN|Ulanhot Yilelite
WXN|Wanzhou|CN|Wanzhou Wuqiao
WNH|Wenshan|CN|Wenshan Puzhehei
WSK|Wushan|CN|Chongqing Wushan
DXJ|Xiangxi|CN|Xiangxi Biancheng
WUT|Xinzhou|CN|Xinzhou Wutaishan
ZFL|Zhaosu|CN|Zhaosu Tianma
LCR|La Chorrera|CO|Virgilio Barco Vargas (La Chorrera)
LMC|La Macarena|CO|La Macarena
LPD|La Pedrera|CO|La Pedrera
NQU|Nuquí|CO|Reyes Murillo
LQM|Puerto Leguízamo|CO|Caucaya
TLU|Santiago de Tolú|CO|Golfo de Morrosquillo
RVE|Saravena|CO|Los Colonizadores
TCD|Tarapacá|CO|Tarapacá
SFL|São Filipe|CV|São Filipe
BMR|Baltrum|DE|Baltrum
BMK|Borkum|DE|Borkum
EME|Emden|DE|Emden
HGL|Helgoland|DE|Helgoland-Düne
JUI|Juist|DE|Juist
NOD|Norddeich|DE|Norden-Norddeich
NRD|Norderney|DE|Norderney
HEI|Oesterdeichstrich|DE|Heide-Büsum
AGE|Wangerooge|DE|Wangerooge
BYR|Læsø|DK|Læsø
EBH|El Bayadh|DZ|El Bayadh
LOH|La Toma (Catamayo)|EC|Ciudad de Catamayo
SCY|Puerto Baquerizo Moreno|EC|San Cristóbal
IBB|Puerto Villamil|EC|General Villamil
GMZ|Alajero, La Gomera Island|ES|La Gomera
HUE|Akwi|ET|Humera
DBM|Debre Markos|ET|Debre Markos
DEM|Dembidollo|ET|Dembidollo
DSE|Dessie|ET|Kombolcha
MTF|Mizan Teferi|ET|Mizan Teferi
SZE|Semera|ET|Semera
HIL|Shilavo|ET|Shilavo
SHC|Shire Inda Selassie|ET|Shire Inda Selassie
TIE|Tippi|ET|Tippi
LEV|Bureta|FJ|Levuka
ICI|Cicia|FJ|Cicia
KXF|Koro Island|FJ|Koro Island
LKB|Lakeba Island|FJ|Lakeba Island
PTF|Malolo Lailai Island|FJ|Malolo Lailai Island
MNF|Mana Island|FJ|Mana Island
TVU|Matei|FJ|Matei
MFJ|Moala|FJ|Moala
NGI|Ngau|FJ|Ngau
RTA|Rotuma|FJ|Rotuma
SVU|Savusavu|FJ|Savusavu
VBV|Vanua Balavu|FJ|Vanua Balavu
KDV|Vunisea|FJ|Vunisea
YAS|Yasawa Island|FJ|Yasawa Island
PSY|Stanley|FK|Port Stanley
LPY|Chaspuzac, Haute-Loire|FR|Le Puy-Loudes
LTT|Saint-Tropez|FR|La Môle
OUI|Ushant|FR|Ouessant
GAX|Gamba|GA|Gamba
COL|Coll Island|GB|Coll
CSA|Colonsay|GB|Colonsay
FIE|Fair Isle|GB|Fair Isle
FOA|Foula|GB|Foula
LEQ|Land's End, Cornwall|GB|Land's End
LWK|Lerwick, Shetland Islands|GB|Lerwick / Tingwall
OBN|North Connel|GB|Oban
NRL|North Ronaldsay|GB|North Ronaldsay
PPW|Papa Westray, Orkney Islands|GB|Papa Westray
NDY|Sanday|GB|Sanday
ISC|St. Mary's, Isles of Scilly|GB|St. Mary's
SOY|Stronsay|GB|Stronsay
WRY|Westray, Orkney Islands|GB|Westray
CRU|Carriacou Island|GD|Lauriston
JSU|Maniitsoq|GL|Maniitsoq
JFR|Paamiut|GL|Paamiut
JUV|Upernavik|GL|Upernavik
JQA|Uummannaq|GL|Qaarsut
BBR|Basse-Terre|GP|Basse-Terre Baillif
DSD|Grande Anse|GP|La Désirade
SFC|St-François|GP|St-François
NBN|San Antonio de Palé|GQ|Annobón
KSO|Argos Orestiko|GR|Kastoria National Airport Aristotle
JTY|Astypalaia Island|GR|Astypalaia
JIK|Ikaria Island|GR|Ikaria
JKL|Kalymnos Island|GR|Kalymnos
KSJ|Kasos Island|GR|Kasos
KZS|Kastelorizo Island|GR|Kastelorizo
KIT|Kithira Island|GR|Kithira
LRS|Leros Island|GR|Leros
LXS|Limnos Island|GR|Limnos
MLO|Milos Island|GR|Milos
JNX|Naxos|GR|Naxos Island National
PAS|Paros|GR|Paros National
SKU|Skiros Island|GR|Skiros
JSY|Syros Island|GR|Syros
HUG|Huehuetenango|GT|Huehuetenango
AAZ|Quezaltenango|GT|Quezaltenango
PEU|Puerto Lempira|HN|Puerto Lempira
UII|Utila Island|HN|Utila
ABU|Atambua|ID|AA Bere Tallo (Haliwen)
RTI|Ba'a - Rote Island|ID|David Constantijn Saudale
BTW|Batu Licin|ID|Bersujud
KSR|Benteng|ID|Selayar - Haji Aroeppala
BUI|Bokondini|ID|Bokondini
BXT|Bontang-Borneo Island|ID|LNG Badak
UOL|Buol|ID|Buol - Pogogul
CJN|Cijulang|ID|Nusawiru
DTD|Datadawai-Borneo Island|ID|Datadawai
DEX|Dekai|ID|Nop Goliat Dekai
ENE|Ende|ID|H. Hasan Aroeboesman (Ende)
GTO|Gorontalo|ID|Jalaluddin
DJB|Jambi|ID|Sultan Thaha
JBB|Jember|ID|Notohadinegoro
ARD|Kabola|ID|Alor Island - Mali
KWB|Karimunjawa|ID|Dewadaru
KDI|Kendari|ID|Haluoleo
LBJ|Labuan Bajo, Manggarai Barat|ID|Komodo
LSW|Lhok Seumawe-Sumatra Island|ID|Malikus Saleh
LKM|Lolak|ID|Bolaang Mongondow
LPU|Long Apung-Borneo Island|ID|Long Apung
LBW|Long Bawan|ID|Yuvai Semaring
LKI|Lubang|ID|Lasikin
LNU|Malinau|ID|Robert Atty Bessing
MOH|Morowali|ID|Maleo
BUU|Muara Bungo|ID|Muara Bungo
HMS|Muara Teweh|ID|Haji Muhammad Sidik
MPC|Muko Muko|ID|Muko Muko
LLO|Palopo|ID|Bua - Palopo Lagaligo
PKN|Pangkalanbun|ID|Iskandar
TMC|Radamata|ID|Tambolaka
BWX|Rogojampi, Banyuwangi|ID|Banyuwangi
SMQ|Sampit|ID|Sampit (H.Asan)
RTG|Satar Tacik, Manggarai|ID|Frans Sales Lega
SXK|Saumlaki-Yamdena Island|ID|Mathilda Batlayeri
KLP|Seruyan|ID|Seruyan Kuala Pembuang
DTB|Siborong-Borong|ID|Silangit
FSH|Singkil|ID|Syekh Hamzah Fansyuri
RKI|Sipura Island|ID|Mentawai
KBU|Stagen|ID|Gusti Syamsir Alam
SWQ|Sumbawa Besar|ID|Sultan Muhammad Kaharuddin III
KRC|Sungai Penuh|ID|Departi Parbo
TJQ|Tanjung Pandan|ID|H A S Hanandjoeddin International
TJS|Tanjung Selor-Borneo Island|ID|Tanjung Harapan
JIO|Tiakur|ID|Jos Orno Imsula
LKA|Tiwatobi|ID|Larantuka Gewayentana
OJU|Tojo Una-Una|ID|Tanjung Api
TLI|Toli Toli-Celebes Island|ID|Sultan Bantilan
TBM|Tumbang Samba-Borneo Island|ID|Tumbang Samba
WGP|Waingapu-Sumba Island|ID|Umbu Mehang Kunda
MOF|Waioti|ID|Frans Xavier Seda
RJM|Waisai|ID|Marinda
IIA|Inis Meáin|IE|Inishmaan
IOR|Inis Mór|IE|Inishmore
INQ|Inis Oírr|IE|Inisheer
NNR|Inverin|IE|Connemara Regional
AIP|Adampur|IN|Adampur
DGH|Deoghar|IN|Deoghar
DIU|Diu|IN|Diu
HDO|Ghaziabad|IN|Hindon Airport / Hindon Air Force Station
JGB|Jagdalpur|IN|Jagdalpur
JLG|Jalgaon|IN|Jalgaon
JRG|Jharsuguda|IN|Jharsuguda
GBI|Kalaburagi|IN|Kalaburagi
VSV|Shravasti|IN|Shravasti
TCR|Vagaikulam|IN|Tuticorin
JSK|Bandar-e-Jask|IR|Jask
PFQ|Parsabad|IR|Parsabad-Moghan
SNX|Semnan|IR|Semnan Municipal
THO|Þórshöfn|IS|Þórshöfn
AGJ|Aguni|JP|Aguni
JJM|Meru-Kinna|KE|Mulika Lodge
AAK|Buariki|KI|Aranuka
BBG|Butaritari|KI|Butaritari
UZR|Urzhar|KZ|Urzhar
USJ|Usharal|KZ|Usharal
SZI|Zaysan|KZ|Zaysan
LXG|Luang Namtha|LA|Luang Namtha
ODY|Oudomsay|LA|Oudomsay
XKH|Xieng Khouang|LA|Xieng Khouang
MRA|Misrata|LY|Misrata International
DWB|Soalala|MG|Soalala
WTA|Tambohorano|MG|Tambohorano
TTS|Tsaratanana|MG|Tsaratanana
JEJ|Ailinglapalap Atoll|MH|Jeh
AUL|Aur Atoll|MH|Aur Island
EJT|Enejit Island|MH|Enejit
ENT|Eniwetok Atoll|MH|Eniwetok
UIT|Jabor Jaluit Atoll|MH|Jaluit
KIO|Kili Island|MH|Kili
LIK|Likiep Island|MH|Likiep
MJE|Majkin|MH|Majkin
MIJ|Mili Island|MH|Mili Island
RNP|Rongelap Island|MH|Rongelap Island
UJE|Ujae Atoll|MH|Ujae Atoll
UTK|Utirik Island|MH|Utirik
WTO|Wotho Island|MH|Wotho Island
WTE|Wotje|MH|Wotje
BMO|Banmaw|MM|Banmaw
KHM|Kanti|MM|Kanti
MWQ|Magway|MM|Magway
MNU|Mawlamyine|MM|Mawlamyine
NYU|Nyaung U|MM|Bagan
BSX|Pathein|MM|Pathein
MXW|Mandalgobi|MN|Mandalgobi
ULZ|Uliastai|MN|Donoi
DRV|Baa Atoll|MV|Dharavandhoo
FMT|Faresmaathodaa|MV|Faresmaathoda
FND|Funadhoo|MV|Funadhoo
HRF|Hoarafushi|MV|Hoarafushi
GKK|Huvadhu Atoll|MV|Kooddoo
HDK|Kulhudhuffushi|MV|Kulhudhuffushi
RUL|Maavaarulu|MV|Maavaarulaa
TMF|Thimarafushi|MV|Thimarafushi
CUA|Comondú|MX|Ciudad Constitución National
SRL|Mulegé|MX|Palo Verde
PPE|Puerto Peñasco|MX|Mar de Cortés International
GUB|San Quintín|MX|Guerrero Negro
BKM|Bakalalan|MY|Bakalalan
KUD|Kudat|MY|Kudat
LWY|Lawas|MY|Lawas
LBP|Long Banga|MY|Long Banga
LGL|Long Datih|MY|Long Lellang
ODN|Long Seridan|MY|Long Seridan
PKG|Pangkor Island|MY|Pulau Pangkor
TMG|Tomanggong|MY|Tomanggong
VJB|Xai-Xai|MZ|Xai-Xai Chongoene
HAL|Halali|NA|Halali
KOC|Koumac|NC|Koumac
BMY|Waala|NC|Île Art - Waala
RNI|Corn Island|NI|Corn Island
FDE|Førde|NO|Førde Airport, Bringeland
HAA|Hasvik|NO|Hasvik
OSY|Namsos|NO|Namsos
RET|Røst|NO|Røst
SDN|Sandane|NO|Sandane Airport, Anda
SOG|Sogndal|NO|Sogndal Airport, Haukåsen
BDP|Bhadrapur|NP|Bhadrapur
BHR|Bharatpur|NP|Bharatpur
DOP|Dolpa|NP|Dolpa
JMO|Jomsom|NP|Jomsom
JUM|Jumla|NP|Jumla
SIH|Silgadi Doti|NP|Silgadi Doti
SIF|Simara|NP|Simara
IMK|Simikot|NP|Simikot
SKH|Surkhet|NP|Surkhet
TMI|Tumling Tar|NP|Tumling Tar
GBZ|Claris|NZ|Great Barrier
PCN|Koromiko|NZ|Picton
OTD|Contadora Island|PA|Raul Arias Espinoza
BLB|Panamá City|PA|Panamá Pacífico International
PDM|Pedasí|PA|Capt. J. Montenegro
BFQ|Puerto Piña|PA|Bahia Piña
RIH|Río Hato|PA|Scarlett Martinez International
ANS|Andahuaylas|PE|Andahuaylas
APK|Apataki|PF|Apataki
FHZ|Fakahina|PF|Fakahina
HHZ|Hikueru|PF|Hikueru
KHZ|Kauehi|PF|Kauehi
NIU|Naiu Atoll|PF|Naiu
NAU|Napuka Island|PF|Napuka Island
PKP|Puka Puka|PF|Puka Puka
RVV|Raivavae|PF|Raivavae
RRR|Raroia|PF|Raroia
RMT|Rimatara Island|PF|Rimatara
TKV|Tatakoto|PF|Tatakoto
UAH|Ua Huka|PF|Ua Huka
UAP|Ua Pou|PF|Ua Pou
BOT|Bosset|PG|Bosset
GMI|Gasmata Island|PG|Gasmata Island
KIE|Kieta|PG|Aropa
KRI|Kikori|PG|Kikori
UNG|Kiunga|PG|Kiunga
LMY|Lake Murray|PG|Lake Murray
LNV|Londolovit|PG|Londolovit
LSA|Losuia|PG|Losuia
MIS|Misima Island|PG|Misima Island
MXH|Moro|PG|Moro
OBX|Obo|PG|Obo
TDS|Sasereme|PG|Sasereme
TBG|Tabubil|PG|Tabubil
TPI|Tapini|PG|Tapini
TIZ|Tari|PG|Tari
TFI|Tufi|PG|Tufi
CYU|Cuyo|PH|Cuyo
IAO|Del Carmen|PH|Siargao
ENI|El Nido|PH|El Nido
SWL|San Vicente|PH|San Vicente
DBA|Dalbandin|PK|Dalbandin
HDD|Hyderabad|PK|Hyderabad
KDD|Khuzdar|PK|Khuzdar
MFG|Muzaffarabad|PK|Muzaffarabad
MQC|Miquelon|PM|Miquelon
CVU|Corvo|PT|Corvo
KVK|Apatity|RU|Kirovsk-Apatity
BQJ|Batagay|RU|Batagay
SUK|Batagay-Alyta|RU|Sakkyryr
ODO|Bodaybo|RU|Bodaybo
BQG|Bogorodskoye|RU|Bogorodskoye
DLR|Dalnerechensk|RU|Dalnerechensk
DPT|Deputatskiy|RU|Deputatskiy
ITU|Kurilsk|RU|Iturup
LDG|Leshukonskoye|RU|Leshukonskoye
KVM|Markovo|RU|Markovo
MJY|Motygino|RU|Motygino
NZG|Nizhneangarsk|RU|Nizhneangarsk International
NGK|Nogliki|RU|Nogliki
TLY|Plastun|RU|Plastun
EKS|Shakhtyorsk|RU|Shakhtyorsk
CSH|Solovetsky Islands|RU|Solovki
SUY|Suntar|RU|Suntar
TKM|Taksimo|RU|Taksimo
GOY|Tura|RU|Tura Mountain
THX|Turukhansk|RU|Turukhansk
UKG|Ust-Kuyga|RU|Ust-Kuyga
UMS|Ust-Maya|RU|Ust-Maya
VHV|Verkhnevilyuisk|RU|Verkhnevilyuisk
DEE|Yuzhno-Kurilsk|RU|Yuzhno-Kurilsk Mendeleyevo
BNY|Anua|SB|Bellona/Anua
AKS|Auki|SB|Gwaunaru'u
BAS|Ballalae|SB|Ballalae
CHY|Choiseul Bay|SB|Choiseul Bay
FRE|Fera Island|SB|Fera/Maringe
GTA|Gatokae|SB|Gatokae
GZO|Gizo|SB|Nusatupe
KGE|Kagau Island|SB|Kaghau
IRA|Kirakira|SB|Ngorangora
MHM|Manaoba|SB|Manaoba
RUS|Marau|SB|Marau
RBV|Ramata|SB|Ramata
RNL|Rennell Island|SB|Rennell/Tingoa
NNB|Santa Ana Island|SB|Santa Ana
SCZ|Santa Cruz/Graciosa Bay/Luova|SB|Santa Cruz/Graciosa Bay/Luova
MNY|Stirling Island|SB|Mono
VAO|Suavanao|SB|Suavanao
XYA|Yandina|SB|Yandina
HMV|Hemavan|SE|Hemavan
PJA|Pajala|SE|Pajala
HFS|Råda|SE|Hagfors
EVG|Sveg|SE|Sveg
BLW|Beledweyne|SO|Beledweyne
GLK|Galcaio|SO|Galcaio
GGR|Garowe|SO|Garowe
DRJ|Drietabbetje|SR|Drietabbetje
EAX|Kwatta|SR|Eduard Alexander Gummels
MOJ|Moengo|SR|Moengo
ORG|Paramaribo|SR|Zorg en Hoop
AGI|Wageningen|SR|Wageningen
SLX|Salt Cay|TC|Salt Cay
EUA|Eua Island|TO|Kaufana
NTT|Niuatoputapu|TO|Kuini Lavenia
BKZ|Bukoba|TZ|Bukoba
TKQ|Kigoma|TZ|Kigoma
MFA|Kilindoni|TZ|Mafia
MUZ|Musoma|TZ|Musoma
SEU|Seronera|TZ|Seronera
SHY|Shinyanga|TZ|Shinyanga
TBO|Tabora|TZ|Tabora
KXO|Kisoro|UG|Kisoro
AKK|Akhiok|US|Akhiok
KKI|Akiachak|US|Akiachak
AKI|Akiak|US|Akiak
KQA|Akutan|US|Akutan
AUK|Alakanuk|US|Alakanuk
AET|Allakaket|US|Allakaket
OTS|Anacortes|US|Anacortes
AKB|Atka|US|Atka
ATT|Atmautluak|US|Atmautluak
WBQ|Beaver|US|Beaver
BTT|Bettles|US|Bettles
KBC|Birch Creek|US|Birch Creek
BYW|Blakely Island|US|Blakely Island
BID|Block Island|US|Block Island State
KTS|Brevig Mission|US|Brevig Mission
BKC|Buckland|US|Buckland
CWS|Center Island|US|Center Island
CEM|Central|US|Central
CIK|Chalkyitsik|US|Chalkyitsik
CYF|Chefornak|US|Chefornak
NCN|Chenega|US|Chenega Bay
VAK|Chevak|US|Chevak
CKX|Chicken|US|Chicken
KCG|Chignik|US|Chignik
KCQ|Chignik Lake|US|Chignik Lake
CHU|Chuathbaluk|US|Chuathbaluk
IRC|Circle|US|Circle City (New)
CLP|Clarks Point|US|Clarks Point
CKD|Crooked Creek|US|Crooked Creek
DTR|Decatur|US|Decatur Shores
EAA|Eagle|US|Eagle
WDN|Eastsound|US|Waldron
EEK|Eek|US|Eek
ELI|Elim|US|Elim
KFP|False Pass|US|False Pass
SSW|Friday Harbor|US|Stuart Island Airpark
GLV|Golovin|US|Golovin
GNU|Goodnews|US|Goodnews
KGX|Grayling|US|Grayling
HNH|Hoonah|US|Hoonah
HPB|Hooper Bay|US|Hooper Bay
HUS|Hughes|US|Hughes
IGG|Igiugig|US|Igiugig
IWD|Ironwood|US|Gogebic Iron County
LUP|Kalaupapa|US|Kalaupapa
KLG|Kalskag|US|Kalskag
KAL|Kaltag|US|Kaltag
KYK|Karluk|US|Karluk
KUK|Kasigluk|US|Kasigluk
KVC|King Cove|US|King Cove
KPN|Kipnuk|US|Kipnuk
KVL|Kivalina|US|Kivalina
OBU|Kobuk|US|Kobuk
KNK|Kokhanok|US|Kokhanok
KGK|Koliganek|US|Koliganek
KKH|Kongiganak|US|Kongiganak
KOT|Kotlik|US|Kotlik
KKA|Koyuk|US|Koyuk Alfred Adams
KYU|Koyukuk|US|Koyukuk
KWT|Kwethluk|US|Kwethluk
KWK|Kwigillingok|US|Kwigillingok
KLN|Larsen Bay|US|Larsen Bay
LPS|Lopez|US|Lopez Island
MBL|Manistee|US|Manistee County Blacker
MLY|Manley Hot Springs|US|Manley Hot Springs
KMO|Manokotak|US|Manokotak
MLL|Marshall|US|Marshall Don Hunter Sr
MVY|Martha's Vineyard|US|Martha's Vineyard
MYK|May Creek|US|May Creek
WWT|Mertarvik|US|Mertarvik
LMA|Minchumina|US|Minchumina
MNT|Minto|US|Minto Al Wright
MTP|Montauk|US|Montauk
MOU|Mountain Village|US|Mountain Village
KEB|Nanwalek|US|Nanwalek
WNA|Napakiak|US|Napakiak
PKA|Napaskiak|US|Napaskiak
NLG|Nelson Lagoon|US|Nelson Lagoon
KNW|New Stuyahok|US|New Stuyahok
NME|Nightmute|US|Nightmute
NIB|Nikolai|US|Nikolai
IKO|Nikolski|US|Nikolski Air Station
WTK|Noatak|US|Noatak
ORV|Noorvik|US|Robert (Bob) Curtis Memorial
NUL|Nulato|US|Nulato
SXP|Nunam Iqua|US|Nunam Iqua
NUP|Nunapitchuk|US|Nunapitchuk
OLH|Old Harbor|US|Old Harbor
KOZ|Ouzinkie|US|Ouzinkie
PDB|Pedro Bay|US|Pedro Bay
KPV|Perryville|US|Perryville
PIP|Pilot Point|US|Pilot Point
PQS|Pilot Station|US|Pilot Station
PHO|Point Hope|US|Point Hope
PTA|Port Alsworth|US|Port Alsworth
PGM|Port Graham|US|Port Graham
ORI|Port Lions|US|Port Lions
KWN|Quinhagak|US|Quinhagak
RMP|Rampart|US|Rampart
RDV|Red Devil|US|Red Devil
RCE|Roche Harbor|US|Roche Harbor
RSH|Russian Mission|US|Russian Mission
SCM|Scammon Bay|US|Scammon Bay
WLK|Selawik|US|Selawik
SOV|Seldovia|US|Seldovia
SKK|Shaktoolik|US|Shaktoolik
SHH|Shishmaref|US|Shishmaref
SHG|Shungnak|US|Shungnak
SGY|Skagway|US|Skagway
SLQ|Sleetmute|US|Sleetmute
WSN|South Naknek|US|South Naknek Number 2
KSM|St Mary's|US|St Mary's
SMK|St Michael|US|St Michael
WBB|Stebbins|US|Stebbins
SVS|Stevens Village|US|Stevens Village
SRV|Stony River|US|Stony River 2
TCT|Takotna|US|Takotna
TAL|Tanana|US|Ralph M Calhoun Memorial
TEK|Tatitlek|US|Tatitlek
TLA|Teller|US|Teller
TNC|Tin City|US|Tin City Long Range Radar Station
TOG|Togiak Village|US|Togiak
TKJ|Tok|US|Tok Junction
OOK|Toksook Bay|US|Toksook Bay
TLT|Tuluksak|US|Tuluksak
WTL|Tuntutuliak|US|Tuntutuliak
TNK|Tununak|US|Tununak
TWA|Twin Hills|US|Twin Hills
VEE|Venetie|US|Venetie
WAA|Wales|US|Wales
WMO|White Mountain|US|White Mountain
CYT|Yakataga|US|Yakataga
KSQ|Karshi|UZ|Karshi
LRV|Gran Roque Island|VE|Los Roques
ICC|Isla de Coche|VE|Andrés Miguel Salazar Marcano
VCL|Tam Nghĩa|VN|Chu Lai
THD|Thanh Hóa|VN|Tho Xuan
CCV|Craig Cove|VU|Craig Cove
VLS|Epi Island|VU|Valesdir
FTA|Futuna Island|VU|Futuna
LPM|Lamap|VU|Lamap
LNB|Lamen Bay|VU|Lamen Bay
LOD|Longana|VU|Longana
LNE|Lonorore|VU|Lonorore
NUS|Norsup|VU|Norsup
OLJ|Olpoi|VU|North West Santo
PBJ|Paama Island|VU|Tavie
SSR|Pentecost Island|VU|Sara
SLH|Sola|VU|Sola
TGH|Tongoa Island|VU|Tongoa
WLH|Walaha|VU|Walaha
FUT|Futuna Island|WF|Pointe Vele
KAA|Kasama|ZM|Kasama
SLI|Solwesi|ZM|Solwesi`;

export const WORLD_AIRPORTS: Airport[] = DATA.split("\n").map((line) => {
  const [code, city, cc, name] = line.split("|");
  const [country, region] = COUNTRIES[cc] ?? [cc, "Asia"];
  return { code, city, country, region, name };
});
