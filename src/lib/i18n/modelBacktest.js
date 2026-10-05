// Model backtest i18n fragment (REQ-E14-10, BL-112). Namespace: mb.*
//
// Business language: which forecast model gives PTI the best service when its
// own ordering is replayed on past data — fill rate and warehouse space, not a
// forecast-accuracy score. Mono data (SKU and material codes, dates, figures)
// is rendered through <Data> and never keyed.

/** @type {Record<string, string>} */
export const modelBacktestEn = {
  'mb.title': 'Model backtest',
  'mb.link.fromDemandForecast':
    'Which model each SKU should use, judged by simulated fill rate and warehouse space: Model backtest',
  'mb.subtitle':
    'Each SKU’s forecast model chosen by the service it gives: PTI’s ordering replayed on past data with each candidate’s forecast, measured by fill rate and warehouse space, not by forecast accuracy.',
  'mb.meta.replay': 'Replayed from the week of',
  'mb.meta.to': 'to the week of',
  'mb.meta.origins': '{{count}} forecast origins',
  'mb.meta.computed': 'computed in {{ms}} ms on this device, once per hub date',
  'mb.synthetic':
    'Backtest on synthetic sales history built to reproduce PTI’s current measures. It proves the calculation, not the business answer.',
  'mb.notSwitched':
    'Material planning still runs on SAP’s plan. This page shows whether the engine’s forecast would serve better; switching Material requirement, What to order, Publish to suppliers and Make warehouse room to it is the owner’s decision.',
  'mb.mainNotBuilt':
    'The main model is not built, so it is not a candidate here; when it is supplied it is judged by the same rule.',

  'mb.kpi.skus': 'SKUs compared',
  'mb.kpi.skus.sub': '{{newSkus}} new SKUs stay on SAP’s plan',
  'mb.kpi.beats': 'Engine beats SAP’s plan',
  'mb.kpi.beats.value': '{{n}} of {{m}}',
  'mb.kpi.beats.sub':
    'on fill rate and space · higher fill {{fill}} · less space {{space}} · worse on both {{worse}}',
  'mb.kpi.materials': 'Materials, engine vs SAP’s plan',
  'mb.kpi.materials.sub': 'better on fill rate and space, every SKU on its chosen model',
  'mb.kpi.limit': 'Plan-stability limit',
  'mb.kpi.limit.notSet': 'Not set',
  'mb.kpi.limit.notSet.sub': 'Not enforced until the Material Planner sets it',
  'mb.kpi.limit.set.sub': 'Models above it are not chosen',

  'mb.headline.title': 'What the backtest says',
  'mb.headline.skus':
    'With each SKU on its chosen model, the engine’s forecast beats SAP’s plan on both fill rate and warehouse space for {{n}} of {{m}} SKUs. It fills more weeks for {{fill}} and needs less space for {{space}}; SAP’s plan is better on both for {{worse}}.',
  'mb.headline.portfolio':
    'Across every material: fill rate {{chosen}} on the chosen models, {{floor}} on the fallback alone, {{sap}} on SAP’s plan; pallet-weeks {{chosenPw}}, {{floorPw}} and {{sapPw}}.',
  'mb.headline.caveat':
    'The chosen models are picked on this same backtest, so their figures flatter them a little; the fallback alone is the fair comparison with SAP’s plan.',

  'mb.methods.title': 'Per method',
  'mb.methods.intro':
    'Pooled over the SKUs each method was replayed for. Accuracy (WAPE) is shown but not used to choose.',
  'mb.methods.col.method': 'Method',
  'mb.methods.col.skus': 'SKUs',
  'mb.methods.col.fill': 'Fill rate',
  'mb.methods.col.complete': 'Order-complete',
  'mb.methods.col.pallets': 'Pallet-weeks',
  'mb.methods.col.masc': 'MASC, median',
  'mb.methods.col.wape': 'WAPE, median',
  'mb.methods.col.chosen': 'Chosen for',
  'mb.methods.benchmark': 'benchmark',

  'mb.candidate.main': 'Main model',
  'mb.candidate.comb': 'Comb (fallback)',
  'mb.candidate.theta': 'Theta',
  'mb.candidate.sba': 'SBA',
  'mb.candidate.croston': 'Croston',
  'mb.candidate.tsb': 'TSB',
  'mb.candidate.sapPlan': 'SAP’s plan',

  'mb.portfolio.title': 'Every material, replayed',
  'mb.portfolio.intro':
    'Every sourced material replayed with every SKU on SAP’s plan, on the fallback, or on its chosen model; new SKUs stay on SAP’s plan in all three. The replay holds only the stock these orders create, not today’s warehouse, so the peak is compared with capacity only to show the difference between plans.',
  'mb.portfolio.col.scenario': 'Every SKU on',
  'mb.portfolio.col.fill': 'Fill rate',
  'mb.portfolio.col.unitFill': 'Units served',
  'mb.portfolio.col.pallets': 'Pallet-weeks',
  'mb.portfolio.col.packaging': 'Packaging: peak pallets',
  'mb.portfolio.col.rawMaterial': 'Raw material: peak pallets',
  'mb.portfolio.ofCapacity': 'of {{cap}} · {{over}} pallet-weeks over',
  'mb.scenario.sapPlan': 'SAP’s plan',
  'mb.scenario.floor': 'The fallback',
  'mb.scenario.chosen': 'The chosen model',

  'mb.origins.title': 'Forecast origins',
  'mb.origins.intro':
    'Each origin’s forecast is the plan in force until the next one. Fill rate here counts the weeks whose orders were released under that origin’s plan.',
  'mb.origins.col.origin': 'Origin',
  'mb.origins.col.events': 'Events in its weeks',
  'mb.origins.none': 'None',
  'mb.origins.allowed':
    'The synthetic history runs from {{from}}; SAP’s plan has weekly snapshots only from {{firstOrigin}}, and a SKU needs 52 weeks of history. So Ramadan 1446 (March 2025) and 11.11 in 2024 cannot be tested; 11.11 in 2025 and Ramadan 1447 with Lebaran 2026 can.',
  'mb.event.payday': 'Payday',
  'mb.event.doubleDate': 'Double-date (incl. 11.11)',
  'mb.event.christmas': 'Christmas',
  'mb.event.ramadan': 'Ramadan {{year}}',
  'mb.event.preRamadan': 'Before Ramadan',

  'mb.skus.title': 'SKUs',
  'mb.skus.intro':
    'Each cell: fill rate · pallet-weeks · MASC. Select a SKU for accuracy, bias and its materials.',
  'mb.skus.col.sku': 'SKU',
  'mb.skus.col.chosen': 'Chosen',
  'mb.skus.col.vsSap': 'Against SAP’s plan',
  'mb.reason.floor': 'Nothing beat the fallback',
  'mb.reason.beatsFloor': 'Beat the fallback',
  'mb.reason.mascLimit': 'A better model was over the stability limit',
  'mb.vs.better': 'Better',
  'mb.vs.worse': 'Worse',
  'mb.vs.equal': 'Equal',
  'mb.vs.mixed': 'Mixed',

  'mb.detail.title': 'Candidates',
  'mb.detail.col.candidate': 'Candidate',
  'mb.detail.col.fill': 'Fill rate',
  'mb.detail.col.complete': 'Order-complete',
  'mb.detail.col.unitFill': 'Units served',
  'mb.detail.col.pallets': 'Pallet-weeks',
  'mb.detail.col.masc': 'MASC',
  'mb.detail.col.wape': 'WAPE',
  'mb.detail.col.bias': 'Bias',
  'mb.detail.col.status': 'Selection',
  'mb.detail.floor': 'Fallback (floor)',
  'mb.detail.benchmark': 'Benchmark, not chosen',
  'mb.detail.chosen': 'Chosen',
  'mb.detail.beats': 'Beats the fallback',
  'mb.detail.notBeats': 'Does not beat the fallback',
  'mb.detail.overLimit': 'Over the stability limit',
  'mb.detail.materials': 'Replayed on its part of: {{materials}}',

  'mb.materials.title': 'Materials',
  'mb.materials.intro': 'Each cell: SAP’s plan · the fallback · the chosen model.',
  'mb.materials.all': 'All',
  'mb.materials.packaging': 'Packaging',
  'mb.materials.rawMaterial': 'Raw material',
  'mb.materials.col.material': 'Material',
  'mb.materials.col.lead': 'Lead time',
  'mb.materials.col.fill': 'Fill rate',
  'mb.materials.col.pallets': 'Pallet-weeks',
  'mb.materials.col.vsSap': 'Chosen against SAP’s plan',
  'mb.materials.weeks': '{{count}} wk',
  'mb.materials.unreplayed': 'Not replayed (no source to order from): {{materials}}',

  'mb.masc.title': 'Plan stability (MASC) spread, to set the limit',
  'mb.masc.intro':
    'MASC is the average change between one forecast version and the next, over the weeks both carry, as a share of the SKU’s typical seasonal-naive error. Lower is steadier for suppliers. The limit is to be set from this first backtest; until it is, it is not enforced.',
  'mb.masc.col.candidate': 'Candidate',
  'mb.masc.col.skus': 'SKUs',
  'mb.masc.col.min': 'Lowest',
  'mb.masc.col.p25': '25%',
  'mb.masc.col.median': 'Median',
  'mb.masc.col.p75': '75%',
  'mb.masc.col.max': 'Highest',
  'mb.masc.limitNotSet': 'Limit: not set. Set it on Administration → Tolerances.',
  'mb.masc.limitSet':
    'Limit in force: {{limit}}. {{excluded}} SKUs kept the fallback because a better model was over it.',

  'mb.decisions.title': 'Decisions for the owner',
  'mb.decisions.switch':
    'Switch material planning to the engine forecast? Today Material requirement, What to order, Publish to suppliers and Make warehouse room run on SAP’s plan. The evidence is above; the switch itself is yours to decide.',
  'mb.decisions.limit':
    'The plan-stability limit: choose it from the spread above and set it on Administration → Tolerances; until then it is not enforced.',

  'mb.def.title': 'How the backtest works',
  'mb.def.replay':
    'At each origin every candidate forecasts as if it were that day. Each week PTI’s policy is replayed: safety stock from the plan’s own past errors at the material’s fill-rate target (SAP’s safety stock until 8 error windows exist), the requirement exploded through the BOM and netted, the order sized to the MOQ and multiple, released and received after the lead time, and what was actually needed served from stock; what cannot be served is lost.',
  'mb.def.part':
    'A SKU is judged on its own part of each of its materials: its own requirement, the material’s lead time and target, and the MOQ, multiple and SAP safety stock scaled to its share of the material.',
  'mb.def.measures':
    'Fill rate: weeks fully served ÷ weeks with demand. Order-complete: weeks in which every one of the SKU’s materials was fully served. Pallet-weeks: stock at each week’s end ÷ units per pallet, added up.',
  'mb.def.select':
    'Choosing: a candidate must fill at least as many weeks as the fallback and be better on fill rate or on space; among those within the stability limit, the best fill rate wins, then the least space. SAP’s plan is the benchmark and is never chosen.'
};

/** @type {Record<string, string>} */
export const modelBacktestId = {
  'mb.title': 'Backtest model',
  'mb.link.fromDemandForecast':
    'Model yang sebaiknya dipakai setiap SKU, dinilai dari tingkat pemenuhan dan ruang gudang hasil simulasi: Backtest model',
  'mb.subtitle':
    'Model prakiraan setiap SKU dipilih berdasarkan layanan yang dihasilkannya: pemesanan PTI diputar ulang pada data masa lalu dengan prakiraan setiap kandidat, diukur dengan tingkat pemenuhan dan ruang gudang, bukan dengan akurasi prakiraan.',
  'mb.meta.replay': 'Diputar ulang dari minggu',
  'mb.meta.to': 'sampai minggu',
  'mb.meta.origins': '{{count}} titik awal prakiraan',
  'mb.meta.computed': 'dihitung dalam {{ms}} md di perangkat ini, sekali per tanggal hub',
  'mb.synthetic':
    'Backtest pada riwayat penjualan sintetis yang dibuat untuk meniru ukuran PTI saat ini. Ini membuktikan perhitungannya, bukan jawaban bisnisnya.',
  'mb.notSwitched':
    'Perencanaan material masih berjalan dengan rencana SAP. Halaman ini menunjukkan apakah prakiraan mesin akan melayani lebih baik; memindahkan Kebutuhan material, Apa yang dipesan, Terbitkan ke pemasok, serta Kosongkan ruang gudang ke prakiraan mesin adalah keputusan pemilik.',
  'mb.mainNotBuilt':
    'Model utama belum dibangun, sehingga tidak menjadi kandidat di sini; bila tersedia, model itu dinilai dengan aturan yang sama.',

  'mb.kpi.skus': 'SKU dibandingkan',
  'mb.kpi.skus.sub': '{{newSkus}} SKU baru tetap memakai rencana SAP',
  'mb.kpi.beats': 'Mesin mengungguli rencana SAP',
  'mb.kpi.beats.value': '{{n}} dari {{m}}',
  'mb.kpi.beats.sub':
    'pada tingkat pemenuhan dan ruang · pemenuhan lebih tinggi {{fill}} · ruang lebih kecil {{space}} · lebih buruk pada keduanya {{worse}}',
  'mb.kpi.materials': 'Material, mesin vs rencana SAP',
  'mb.kpi.materials.sub':
    'lebih baik pada tingkat pemenuhan dan ruang, setiap SKU pada model terpilihnya',
  'mb.kpi.limit': 'Batas stabilitas rencana',
  'mb.kpi.limit.notSet': 'Belum ditetapkan',
  'mb.kpi.limit.notSet.sub': 'Tidak diterapkan sampai Material Planner menetapkannya',
  'mb.kpi.limit.set.sub': 'Model di atasnya tidak dipilih',

  'mb.headline.title': 'Hasil backtest',
  'mb.headline.skus':
    'Dengan setiap SKU pada model terpilihnya, prakiraan mesin mengungguli rencana SAP pada tingkat pemenuhan dan ruang gudang sekaligus untuk {{n}} dari {{m}} SKU. Prakiraan mesin memenuhi lebih banyak minggu untuk {{fill}} dan membutuhkan ruang lebih kecil untuk {{space}}; rencana SAP lebih baik pada keduanya untuk {{worse}}.',
  'mb.headline.portfolio':
    'Di seluruh material: tingkat pemenuhan {{chosen}} dengan model terpilih, {{floor}} dengan fallback saja, {{sap}} dengan rencana SAP; palet-minggu {{chosenPw}}, {{floorPw}} dan {{sapPw}}.',
  'mb.headline.caveat':
    'Model terpilih dipilih pada backtest yang sama, sehingga angkanya sedikit menguntungkannya; fallback saja adalah pembanding yang adil untuk rencana SAP.',

  'mb.methods.title': 'Per metode',
  'mb.methods.intro':
    'Digabungkan atas SKU yang diputar ulang untuk setiap metode. Akurasi (WAPE) ditampilkan tetapi tidak dipakai untuk memilih.',
  'mb.methods.col.method': 'Metode',
  'mb.methods.col.skus': 'SKU',
  'mb.methods.col.fill': 'Tingkat pemenuhan',
  'mb.methods.col.complete': 'Pesanan lengkap',
  'mb.methods.col.pallets': 'Palet-minggu',
  'mb.methods.col.masc': 'MASC, median',
  'mb.methods.col.wape': 'WAPE, median',
  'mb.methods.col.chosen': 'Dipilih untuk',
  'mb.methods.benchmark': 'pembanding',

  'mb.candidate.main': 'Model utama',
  'mb.candidate.comb': 'Comb (fallback)',
  'mb.candidate.theta': 'Theta',
  'mb.candidate.sba': 'SBA',
  'mb.candidate.croston': 'Croston',
  'mb.candidate.tsb': 'TSB',
  'mb.candidate.sapPlan': 'Rencana SAP',

  'mb.portfolio.title': 'Seluruh material, diputar ulang',
  'mb.portfolio.intro':
    'Setiap material yang memiliki pemasok diputar ulang dengan setiap SKU pada rencana SAP, pada fallback, atau pada model terpilihnya; SKU baru tetap pada rencana SAP di ketiganya. Pemutaran ulang hanya memuat stok yang dihasilkan pesanan ini, bukan isi gudang hari ini, sehingga puncaknya dibandingkan dengan kapasitas hanya untuk menunjukkan selisih antar rencana.',
  'mb.portfolio.col.scenario': 'Setiap SKU pada',
  'mb.portfolio.col.fill': 'Tingkat pemenuhan',
  'mb.portfolio.col.unitFill': 'Unit terlayani',
  'mb.portfolio.col.pallets': 'Palet-minggu',
  'mb.portfolio.col.packaging': 'Kemasan: puncak palet',
  'mb.portfolio.col.rawMaterial': 'Bahan baku: puncak palet',
  'mb.portfolio.ofCapacity': 'dari {{cap}} · {{over}} palet-minggu di atasnya',
  'mb.scenario.sapPlan': 'Rencana SAP',
  'mb.scenario.floor': 'Fallback',
  'mb.scenario.chosen': 'Model terpilih',

  'mb.origins.title': 'Titik awal prakiraan',
  'mb.origins.intro':
    'Prakiraan setiap titik awal menjadi rencana yang berlaku sampai titik awal berikutnya. Tingkat pemenuhan di sini menghitung minggu yang pesanannya dirilis di bawah rencana titik awal tersebut.',
  'mb.origins.col.origin': 'Titik awal',
  'mb.origins.col.events': 'Peristiwa dalam minggunya',
  'mb.origins.none': 'Tidak ada',
  'mb.origins.allowed':
    'Riwayat sintetis dimulai {{from}}; rencana SAP memiliki snapshot mingguan hanya sejak {{firstOrigin}}, dan sebuah SKU membutuhkan riwayat 52 minggu. Karena itu Ramadan 1446 (Maret 2025) dan 11.11 tahun 2024 tidak dapat diuji; 11.11 tahun 2025 serta Ramadan 1447 dengan Lebaran 2026 dapat diuji.',
  'mb.event.payday': 'Gajian',
  'mb.event.doubleDate': 'Tanggal kembar (termasuk 11.11)',
  'mb.event.christmas': 'Natal',
  'mb.event.ramadan': 'Ramadan {{year}}',
  'mb.event.preRamadan': 'Menjelang Ramadan',

  'mb.skus.title': 'SKU',
  'mb.skus.intro':
    'Setiap sel: tingkat pemenuhan · palet-minggu · MASC. Pilih SKU untuk melihat akurasi, bias dan materialnya.',
  'mb.skus.col.sku': 'SKU',
  'mb.skus.col.chosen': 'Terpilih',
  'mb.skus.col.vsSap': 'Terhadap rencana SAP',
  'mb.reason.floor': 'Tidak ada yang mengungguli fallback',
  'mb.reason.beatsFloor': 'Mengungguli fallback',
  'mb.reason.mascLimit': 'Model yang lebih baik melewati batas stabilitas',
  'mb.vs.better': 'Lebih baik',
  'mb.vs.worse': 'Lebih buruk',
  'mb.vs.equal': 'Sama',
  'mb.vs.mixed': 'Campuran',

  'mb.detail.title': 'Kandidat',
  'mb.detail.col.candidate': 'Kandidat',
  'mb.detail.col.fill': 'Tingkat pemenuhan',
  'mb.detail.col.complete': 'Pesanan lengkap',
  'mb.detail.col.unitFill': 'Unit terlayani',
  'mb.detail.col.pallets': 'Palet-minggu',
  'mb.detail.col.masc': 'MASC',
  'mb.detail.col.wape': 'WAPE',
  'mb.detail.col.bias': 'Bias',
  'mb.detail.col.status': 'Pemilihan',
  'mb.detail.floor': 'Fallback (batas bawah)',
  'mb.detail.benchmark': 'Pembanding, tidak dipilih',
  'mb.detail.chosen': 'Terpilih',
  'mb.detail.beats': 'Mengungguli fallback',
  'mb.detail.notBeats': 'Tidak mengungguli fallback',
  'mb.detail.overLimit': 'Melewati batas stabilitas',
  'mb.detail.materials': 'Diputar ulang pada bagiannya dari: {{materials}}',

  'mb.materials.title': 'Material',
  'mb.materials.intro': 'Setiap sel: rencana SAP · fallback · model terpilih.',
  'mb.materials.all': 'Semua',
  'mb.materials.packaging': 'Kemasan',
  'mb.materials.rawMaterial': 'Bahan baku',
  'mb.materials.col.material': 'Material',
  'mb.materials.col.lead': 'Waktu tunggu',
  'mb.materials.col.fill': 'Tingkat pemenuhan',
  'mb.materials.col.pallets': 'Palet-minggu',
  'mb.materials.col.vsSap': 'Terpilih terhadap rencana SAP',
  'mb.materials.weeks': '{{count}} mg',
  'mb.materials.unreplayed': 'Tidak diputar ulang (tidak ada pemasok untuk dipesan): {{materials}}',

  'mb.masc.title': 'Sebaran stabilitas rencana (MASC), untuk menetapkan batas',
  'mb.masc.intro':
    'MASC adalah rata-rata perubahan dari satu versi prakiraan ke versi berikutnya, pada minggu yang dimuat keduanya, sebagai bagian dari galat musiman-naif khas SKU. Makin rendah makin stabil bagi pemasok. Batasnya ditetapkan dari uji model pertama ini; sampai ditetapkan, batas tidak diterapkan.',
  'mb.masc.col.candidate': 'Kandidat',
  'mb.masc.col.skus': 'SKU',
  'mb.masc.col.min': 'Terendah',
  'mb.masc.col.p25': '25%',
  'mb.masc.col.median': 'Median',
  'mb.masc.col.p75': '75%',
  'mb.masc.col.max': 'Tertinggi',
  'mb.masc.limitNotSet': 'Batas: belum ditetapkan. Tetapkan di Administrasi → Toleransi.',
  'mb.masc.limitSet':
    'Batas yang berlaku: {{limit}}. {{excluded}} SKU tetap pada fallback karena model yang lebih baik melewatinya.',

  'mb.decisions.title': 'Keputusan untuk pemilik',
  'mb.decisions.switch':
    'Pindahkan perencanaan material ke prakiraan mesin? Saat ini Kebutuhan material, Apa yang dipesan, Terbitkan ke pemasok, serta Kosongkan ruang gudang berjalan dengan rencana SAP. Buktinya ada di atas; keputusan pemindahannya ada pada Anda.',
  'mb.decisions.limit':
    'Batas stabilitas rencana: pilih dari sebaran di atas dan tetapkan di Administrasi → Toleransi; sampai saat itu batas tidak diterapkan.',

  'mb.def.title': 'Cara kerja backtest',
  'mb.def.replay':
    'Di setiap titik awal, setiap kandidat membuat prakiraan seolah-olah hari itu. Setiap minggu kebijakan PTI diputar ulang: stok pengaman dari galat rencana itu sendiri di masa lalu pada target tingkat pemenuhan material (stok pengaman SAP sampai ada 8 jendela galat), kebutuhan diurai melalui BOM dan dinetokan, pesanan disesuaikan dengan MOQ dan kelipatannya, dirilis dan diterima setelah waktu tunggu, dan kebutuhan aktual dilayani dari stok; yang tidak dapat dilayani hilang.',
  'mb.def.part':
    'Sebuah SKU dinilai pada bagiannya sendiri dari setiap materialnya: kebutuhannya sendiri, waktu tunggu dan target material, serta MOQ, kelipatan dan stok pengaman SAP yang disesuaikan dengan porsinya pada material itu.',
  'mb.def.measures':
    'Tingkat pemenuhan: minggu yang terlayani penuh ÷ minggu yang ada permintaannya. Pesanan lengkap: minggu ketika setiap material SKU terlayani penuh. Palet-minggu: stok pada akhir setiap minggu ÷ unit per palet, dijumlahkan.',
  'mb.def.select':
    'Pemilihan: sebuah kandidat harus memenuhi paling sedikit sebanyak minggu fallback dan lebih baik pada tingkat pemenuhan atau ruang; di antara yang berada dalam batas stabilitas, tingkat pemenuhan terbaik menang, lalu ruang terkecil. Rencana SAP adalah pembanding dan tidak pernah dipilih.'
};
