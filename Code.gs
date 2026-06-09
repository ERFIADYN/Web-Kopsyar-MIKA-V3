/**
 * Aplikasi Koperasi Simpan Pinjam berbasis Google Sheet.
 *
 * Cara pakai:
 * 1. Buat Google Sheet baru.
 * 2. Buka Extensions > Apps Script.
 * 3. Tempel file ini sebagai Code.gs dan tempel index.html di file HTML bernama index.
 * 4. Deploy > New deployment > Web app.
 *
 * Jika script tidak dibuat dari Google Sheet, isi SPREADSHEET_ID dengan ID spreadsheet.
 */
const SPREADSHEET_ID = '';
let DATABASE_READY = false;

const APP = {
  tz: Session.getScriptTimeZone() || 'Asia/Jakarta',
  sheets: {
    anggota: 'Anggota',
    simpanan: 'Simpanan',
    pinjaman: 'Pinjaman',
    angsuran: 'Angsuran',
    kas: 'Kas',
    coa: 'COA',
    rekening: 'Rekening',
    transaksi: 'Transaksi Keuangan',
    jurnal: 'Jurnal',
    asetTetap: 'Aset Tetap',
    danaKebajikan: 'Dana Kebajikan',
    administrasi: 'Administrasi',
    pengaturan: 'Pengaturan'
  },
  headers: {
    Anggota: [
      'ID Anggota',
      'Nama',
      'Kategori',
      'Identitas',
      'Email',
      'Telepon',
      'Alamat',
      'Tanggal Bergabung',
      'Status',
      'Tanggal Keluar',
      'Catatan',
      'Dibuat Pada',
      'Diubah Pada'
    ],
    Simpanan: [
      'ID Transaksi',
      'Tanggal',
      'ID Anggota',
      'Nama',
      'Jenis Simpanan',
      'Tipe Transaksi',
      'Nominal',
      'Keterangan',
      'Dibuat Pada'
    ],
    Pinjaman: [
      'ID Pinjaman',
      'Tanggal',
      'ID Anggota',
      'Nama',
      'Pokok',
      'Bunga %',
      'Tenor',
      'Biaya Admin',
      'Total Bunga',
      'Total Tagihan',
      'Angsuran Bulanan',
      'Total Dibayar',
      'Sisa Pinjaman',
      'Status',
      'Akad',
      'Program',
      'Tujuan',
      'Keterangan',
      'Dibuat Pada',
      'Tanggal Lunas'
    ],
    Angsuran: [
      'ID Angsuran',
      'Tanggal',
      'ID Pinjaman',
      'ID Anggota',
      'Nama',
      'Angsuran Ke',
      'Nominal Pokok+Bunga',
      'Denda',
      'Total Bayar',
      'Sisa Setelah Bayar',
      'Keterangan',
      'Dibuat Pada'
    ],
    Kas: [
      'ID Kas',
      'Tanggal',
      'Jenis Mutasi',
      'Sumber',
      'Ref ID',
      'ID Anggota',
      'Nama',
      'Masuk',
      'Keluar',
      'Keterangan',
      'Dibuat Pada'
    ],
    COA: [
      'Kode Akun',
      'Nama Akun',
      'Kategori',
      'Normal',
      'Laporan',
      'Grup',
      'Aktif',
      'Keterangan'
    ],
    Rekening: [
      'ID Rekening',
      'Nama Rekening',
      'Bank',
      'Nomor Rekening',
      'Kode Akun',
      'Saldo Awal',
      'Aktif',
      'Keterangan'
    ],
    'Transaksi Keuangan': [
      'ID Transaksi',
      'Tanggal',
      'No Bukti',
      'Jenis',
      'Kode Rekening',
      'Kode Lawan Akun',
      'Nominal',
      'Pihak',
      'Keterangan',
      'Ref ID',
      'Dibuat Pada'
    ],
    Jurnal: [
      'ID Jurnal',
      'Tanggal',
      'No Bukti',
      'Sumber',
      'Ref ID',
      'Kode Akun',
      'Nama Akun',
      'Debet',
      'Kredit',
      'Memo',
      'Dibuat Pada'
    ],
    'Aset Tetap': [
      'ID Aset',
      'Tanggal Perolehan',
      'Nama Aset',
      'Kategori',
      'Kode Akun Aset',
      'Kode Akun Akumulasi',
      'Kode Akun Beban',
      'Nilai Perolehan',
      'Nilai Residu',
      'Umur Bulan',
      'Akumulasi Penyusutan',
      'Nilai Buku',
      'Status',
      'Keterangan'
    ],
    'Dana Kebajikan': [
      'ID Transaksi',
      'Tanggal',
      'Jenis',
      'Sumber/Penggunaan',
      'Nominal',
      'No Bukti',
      'Keterangan',
      'Dibuat Pada'
    ],
    Administrasi: [
      'ID Dokumen',
      'Jenis Dokumen',
      'Nomor',
      'Tanggal',
      'Berlaku Sampai',
      'Penanggung Jawab',
      'Status',
      'Link Dokumen',
      'Keterangan'
    ],
    Pengaturan: ['Key', 'Value', 'Label']
  },
  defaults: [
    ['namaKoperasi', 'Koperasi Simpan Pinjam Kampus', 'Nama koperasi'],
    ['alamatKoperasi', 'Jl. Pendidikan No. 1', 'Alamat koperasi'],
    ['logoUrl', '', 'URL logo koperasi'],
    ['bungaPinjaman', '1.5', 'Bunga pinjaman flat per bulan (%)'],
    ['biayaAdmin', '0', 'Biaya admin pinjaman default'],
    ['mataUang', 'IDR', 'Mata uang'],
    ['rekeningUtama', '1112', 'Kode akun kas/bank utama'],
    ['persenCadangan', '30', 'Pembagian SHU untuk cadangan (%)'],
    ['persenJasaSimpanan', '30', 'Pembagian SHU jasa simpanan (%)'],
    ['persenPartisipasi', '20', 'Pembagian SHU partisipasi anggota (%)'],
    ['persenPengelola', '15', 'Pembagian SHU bonus pengelola (%)'],
    ['persenSosial', '5', 'Pembagian SHU dana sosial (%)']
  ],
  months: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
};

const DEFAULT_COA = [
  ['1111', 'Kas Tunai', 'ASET', 'DEBET', 'NERACA', 'Kas dan Setara Kas', 'Ya', 'Kas fisik koperasi'],
  ['1112', 'Bank Operasional', 'ASET', 'DEBET', 'NERACA', 'Kas dan Setara Kas', 'Ya', 'Rekening bank utama'],
  ['1121', 'Piutang Qardh', 'ASET', 'DEBET', 'NERACA', 'Piutang Pembiayaan', 'Ya', 'Pembiayaan kebajikan tanpa margin'],
  ['1122', 'Piutang Murabahah', 'ASET', 'DEBET', 'NERACA', 'Piutang Pembiayaan', 'Ya', 'Piutang bruto akad murabahah'],
  ['1123', 'Piutang Ijarah Multijasa', 'ASET', 'DEBET', 'NERACA', 'Piutang Pembiayaan', 'Ya', 'Piutang akad ijarah/multijasa'],
  ['1129', 'Margin Murabahah Tangguhan', 'ASET', 'KREDIT', 'NERACA', 'Kontra Piutang', 'Ya', 'Margin belum diakui sebagai pendapatan'],
  ['1211', 'Perlengkapan Kantor', 'ASET', 'DEBET', 'NERACA', 'Aset Lancar Lain', 'Ya', ''],
  ['1311', 'Peralatan dan Inventaris', 'ASET', 'DEBET', 'NERACA', 'Aset Tetap', 'Ya', ''],
  ['1391', 'Akumulasi Penyusutan', 'ASET', 'KREDIT', 'NERACA', 'Kontra Aset Tetap', 'Ya', ''],
  ['2111', 'Hutang Usaha', 'KEWAJIBAN', 'KREDIT', 'NERACA', 'Kewajiban Jangka Pendek', 'Ya', ''],
  ['2112', 'Beban yang Masih Harus Dibayar', 'KEWAJIBAN', 'KREDIT', 'NERACA', 'Kewajiban Jangka Pendek', 'Ya', ''],
  ['2211', 'Simpanan Sukarela Anggota', 'KEWAJIBAN', 'KREDIT', 'NERACA', 'Dana Anggota', 'Ya', ''],
  ['2212', 'Simpanan Khusus / Wakaf Kelolaan', 'KEWAJIBAN', 'KREDIT', 'NERACA', 'Dana Titipan', 'Ya', ''],
  ['3111', 'Simpanan Pokok', 'EKUITAS', 'KREDIT', 'NERACA', 'Modal Anggota', 'Ya', ''],
  ['3112', 'Simpanan Wajib', 'EKUITAS', 'KREDIT', 'NERACA', 'Modal Anggota', 'Ya', ''],
  ['3121', 'Cadangan Koperasi', 'EKUITAS', 'KREDIT', 'NERACA', 'Cadangan', 'Ya', ''],
  ['3199', 'Saldo Awal / Penyesuaian', 'EKUITAS', 'KREDIT', 'NERACA', 'Ekuitas Lain', 'Ya', 'Akun sementara untuk migrasi saldo'],
  ['4111', 'Pendapatan Margin Murabahah', 'PENDAPATAN', 'KREDIT', 'LABA RUGI', 'Pendapatan Pembiayaan', 'Ya', ''],
  ['4112', 'Pendapatan Ujrah Ijarah', 'PENDAPATAN', 'KREDIT', 'LABA RUGI', 'Pendapatan Pembiayaan', 'Ya', ''],
  ['4113', 'Pendapatan Administrasi', 'PENDAPATAN', 'KREDIT', 'LABA RUGI', 'Pendapatan Operasional', 'Ya', ''],
  ['4114', 'Pendapatan Denda untuk Dana Kebajikan', 'DANA KEBAJIKAN', 'KREDIT', 'DANA KEBAJIKAN', 'Sumber Dana Kebajikan', 'Ya', 'Denda tidak diakui sebagai pendapatan koperasi'],
  ['4199', 'Pendapatan Operasional Lain', 'PENDAPATAN', 'KREDIT', 'LABA RUGI', 'Pendapatan Lain', 'Ya', ''],
  ['5111', 'Beban Administrasi Bank', 'BEBAN', 'DEBET', 'LABA RUGI', 'Beban Administrasi', 'Ya', ''],
  ['5112', 'Beban ATK dan Perlengkapan', 'BEBAN', 'DEBET', 'LABA RUGI', 'Beban Administrasi', 'Ya', ''],
  ['5113', 'Beban Rapat dan Konsumsi', 'BEBAN', 'DEBET', 'LABA RUGI', 'Beban Operasional', 'Ya', ''],
  ['5114', 'Beban Transportasi', 'BEBAN', 'DEBET', 'LABA RUGI', 'Beban Operasional', 'Ya', ''],
  ['5115', 'Beban Pemasaran', 'BEBAN', 'DEBET', 'LABA RUGI', 'Beban Operasional', 'Ya', ''],
  ['5116', 'Beban Penyusutan', 'BEBAN', 'DEBET', 'LABA RUGI', 'Beban Nonkas', 'Ya', ''],
  ['5117', 'Beban Pajak dan Zakat', 'BEBAN', 'DEBET', 'LABA RUGI', 'Beban Pajak/Zakat', 'Ya', ''],
  ['5199', 'Beban Operasional Lain', 'BEBAN', 'DEBET', 'LABA RUGI', 'Beban Lain', 'Ya', ''],
  ['6111', 'Penyaluran Dana Kebajikan', 'DANA KEBAJIKAN', 'DEBET', 'DANA KEBAJIKAN', 'Penggunaan Dana Kebajikan', 'Ya', '']
];

function doGet() {
  setupDatabase();
  const settings = getSettings();
  return HtmlService.createTemplateFromFile('index')
    .evaluate()
    .setTitle(settings.namaKoperasi || 'Koperasi Simpan Pinjam')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Koperasi')
    .addItem('Siapkan Database', 'setupDatabase')
    .addToUi();
}

function setupDatabase() {
  const ss = getSpreadsheet_();
  if (DATABASE_READY) {
    return {
      ok: true,
      message: 'Database siap digunakan.',
      spreadsheetUrl: ss.getUrl()
    };
  }
  Object.keys(APP.headers).forEach(function (sheetName) {
    ensureSheet_(ss, sheetName, APP.headers[sheetName]);
  });
  ensureDefaultSettings_();
  ensureDefaultCoa_();
  ensureDefaultBankAccount_();
  DATABASE_READY = true;
  return {
    ok: true,
    message: 'Database siap digunakan.',
    spreadsheetUrl: ss.getUrl()
  };
}

function getAppData(period) {
  setupDatabase();
  const normalizedPeriod = normalizePeriod_(period);
  return {
    settings: getSettings(),
    dashboard: getDashboard(normalizedPeriod),
    members: getMembers(),
    savings: getSavings(),
    loans: getLoans(),
    installments: getInstallments(),
    reports: getFinancialReports(normalizedPeriod),
    accounting: getAccountingData(normalizedPeriod)
  };
}

function getDashboard(period) {
  setupDatabase();
  const normalizedPeriod = normalizePeriod_(period);
  const range = getPeriodRange_(normalizedPeriod);
  const members = buildMembers_();
  const activeMembers = members.filter(function (member) {
    return member.status === 'Aktif';
  });
  const savingsComposition = getSavingsComposition_(members);
  const cashRows = readObjects_(APP.sheets.kas);
  const periodCash = cashRows.filter(function (row) {
    return isInRange_(row['Tanggal'], range);
  });
  const totalKas = cashRows.reduce(function (sum, row) {
    return sum + toNumber_(row['Masuk']) - toNumber_(row['Keluar']);
  }, 0);
  const totalSimpanan = members.reduce(function (sum, member) {
    return sum + member.totalSimpanan;
  }, 0);
  const sisaPinjaman = members.reduce(function (sum, member) {
    return sum + member.sisaPinjaman;
  }, 0);

  return {
    period: {
      mode: normalizedPeriod.mode,
      label: periodLabel_(normalizedPeriod, range),
      startDate: range.start ? formatDate_(range.start) : '',
      endDate: range.end ? formatDate_(range.end) : ''
    },
    metrics: {
      totalKas: roundCurrency_(totalKas),
      totalSimpanan: roundCurrency_(totalSimpanan),
      sisaPinjaman: roundCurrency_(sisaPinjaman),
      totalAnggota: activeMembers.length,
      dosen: activeMembers.filter(function (member) {
        return member.kategori === 'Dosen';
      }).length,
      mahasiswa: activeMembers.filter(function (member) {
        return member.kategori === 'Mahasiswa';
      }).length,
      asetBersihAnggota: roundCurrency_(totalSimpanan - sisaPinjaman),
      kasMasukPeriode: roundCurrency_(periodCash.reduce(function (sum, row) {
        return sum + toNumber_(row['Masuk']);
      }, 0)),
      kasKeluarPeriode: roundCurrency_(periodCash.reduce(function (sum, row) {
        return sum + toNumber_(row['Keluar']);
      }, 0))
    },
    cashFlow: buildMonthlyCashFlow_(cashRows, range),
    savingsComposition: savingsComposition,
    recentCash: mapCashRows_(periodCash)
      .sort(sortByDateDesc_)
      .slice(0, 10)
  };
}

function getMembers() {
  setupDatabase();
  return buildMembers_().sort(function (a, b) {
    return String(a.nama).localeCompare(String(b.nama));
  });
}

function saveMember(member) {
  setupDatabase();
  return withLock_(function () {
    const now = timestamp_();
    const id = cleanString_(member.idAnggota || member['ID Anggota']) || generateId_('AGG');
    const existing = findObjectById_(APP.sheets.anggota, 'ID Anggota', id);
    const name = cleanString_(member.nama || member['Nama']);
    if (!name) {
      throw new Error('Nama anggota wajib diisi.');
    }

    const row = {
      'ID Anggota': id,
      'Nama': name,
      'Kategori': cleanString_(member.kategori || member['Kategori']) || 'Mahasiswa',
      'Identitas': cleanString_(member.identitas || member['Identitas']),
      'Email': cleanString_(member.email || member['Email']),
      'Telepon': cleanString_(member.telepon || member['Telepon']),
      'Alamat': cleanString_(member.alamat || member['Alamat']),
      'Tanggal Bergabung': cleanString_(member.tanggalBergabung || member['Tanggal Bergabung']) || today_(),
      'Status': cleanString_(member.status || member['Status']) || 'Aktif',
      'Tanggal Keluar': cleanString_(member.tanggalKeluar || member['Tanggal Keluar']),
      'Catatan': cleanString_(member.catatan || member['Catatan']),
      'Diubah Pada': now
    };

    if (existing) {
      updateObject_(APP.sheets.anggota, existing._row, row);
    } else {
      row['Dibuat Pada'] = now;
      appendObject_(APP.sheets.anggota, row);
    }

    return {
      ok: true,
      member: buildMembers_().filter(function (item) {
        return item.idAnggota === id;
      })[0]
    };
  });
}

function getMemberExitPreview(idAnggota) {
  setupDatabase();
  const member = buildMembers_().filter(function (item) {
    return item.idAnggota === idAnggota;
  })[0];
  if (!member) {
    throw new Error('Anggota tidak ditemukan.');
  }
  return buildExitSummary_(member);
}

function processMemberExit(payload) {
  setupDatabase();
  return withLock_(function () {
    const idAnggota = cleanString_(payload.idAnggota || payload);
    const tanggal = cleanString_(payload.tanggal) || today_();
    const catatan = cleanString_(payload.catatan) || 'Proses keluar anggota';
    const memberRow = findObjectById_(APP.sheets.anggota, 'ID Anggota', idAnggota);
    if (!memberRow) {
      throw new Error('Anggota tidak ditemukan.');
    }

    const member = buildMembers_().filter(function (item) {
      return item.idAnggota === idAnggota;
    })[0];
    if (!member) {
      throw new Error('Ringkasan anggota tidak ditemukan.');
    }
    if (member.status !== 'Aktif') {
      throw new Error('Anggota sudah berstatus nonaktif.');
    }

    const now = timestamp_();
    const savingTypes = [
      ['Pokok', member.simpananPokok],
      ['Wajib', member.simpananWajib],
      ['Sukarela', member.simpananSukarela]
    ];

    savingTypes.forEach(function (entry) {
      const jenis = entry[0];
      const saldo = roundCurrency_(entry[1]);
      if (saldo <= 0) return;
      const idTransaksi = generateId_('SM');
      const savingRow = {
        'ID Transaksi': idTransaksi,
        'Tanggal': tanggal,
        'ID Anggota': idAnggota,
        'Nama': member.nama,
        'Jenis Simpanan': jenis,
        'Tipe Transaksi': 'Penarikan',
        'Nominal': saldo,
        'Keterangan': catatan,
        'Dibuat Pada': now
      };
      appendObject_(APP.sheets.simpanan, savingRow);
      postSavingJournal_(savingRow);
    });

    if (member.totalSimpanan > 0) {
      appendCash_({
        tanggal: tanggal,
        jenis: 'Keluar',
        sumber: 'Keluar Anggota',
        refId: idAnggota,
        idAnggota: idAnggota,
        nama: member.nama,
        masuk: 0,
        keluar: member.totalSimpanan,
        keterangan: 'Pengembalian seluruh saldo simpanan saat keluar'
      });
    }

    const activeLoans = readObjects_(APP.sheets.pinjaman).filter(function (loan) {
      return loan['ID Anggota'] === idAnggota && loan['Status'] !== 'Lunas' && toNumber_(loan['Sisa Pinjaman']) > 0;
    });
    let totalSettledDebt = 0;

    activeLoans.forEach(function (loan) {
      const sisa = roundCurrency_(loan['Sisa Pinjaman']);
      if (sisa <= 0) return;
      totalSettledDebt += sisa;
      const idAngsuran = generateId_('ANG');
      const angsuranKe = countInstallments_(loan['ID Pinjaman']) + 1;
      const installmentRow = {
        'ID Angsuran': idAngsuran,
        'Tanggal': tanggal,
        'ID Pinjaman': loan['ID Pinjaman'],
        'ID Anggota': idAnggota,
        'Nama': member.nama,
        'Angsuran Ke': angsuranKe,
        'Nominal Pokok+Bunga': sisa,
        'Denda': 0,
        'Total Bayar': sisa,
        'Sisa Setelah Bayar': 0,
        'Keterangan': 'Setelmen pinjaman saat anggota keluar',
        'Dibuat Pada': now
      };
      appendObject_(APP.sheets.angsuran, installmentRow);
      postInstallmentJournal_(installmentRow, loan);
      updateObject_(APP.sheets.pinjaman, loan._row, {
        'Total Dibayar': roundCurrency_(toNumber_(loan['Total Dibayar']) + sisa),
        'Sisa Pinjaman': 0,
        'Status': 'Lunas',
        'Tanggal Lunas': tanggal
      });
    });

    if (totalSettledDebt > 0) {
      appendCash_({
        tanggal: tanggal,
        jenis: 'Masuk',
        sumber: 'Setelmen Pinjaman Keluar',
        refId: idAnggota,
        idAnggota: idAnggota,
        nama: member.nama,
        masuk: totalSettledDebt,
        keluar: 0,
        keterangan: 'Pelunasan pinjaman saat anggota keluar'
      });
    }

    updateObject_(APP.sheets.anggota, memberRow._row, {
      'Status': 'Nonaktif',
      'Tanggal Keluar': tanggal,
      'Catatan': catatan,
      'Diubah Pada': now
    });

    const summary = buildExitSummary_(member);
    return {
      ok: true,
      summary: summary,
      message: summary.nilaiAkhir >= 0
        ? 'Anggota dinonaktifkan. Saldo bersih dibayarkan kepada anggota.'
        : 'Anggota dinonaktifkan. Kekurangan dicatat sebagai setelmen kas masuk.'
    };
  });
}

function getSavings() {
  setupDatabase();
  return mapSavingRows_(readObjects_(APP.sheets.simpanan)).sort(sortByDateDesc_);
}

function saveSavingTransaction(payload) {
  setupDatabase();
  return withLock_(function () {
    const idAnggota = cleanString_(payload.idAnggota);
    const tanggal = cleanString_(payload.tanggal) || today_();
    const jenis = cleanString_(payload.jenisSimpanan) || 'Sukarela';
    const tipe = cleanString_(payload.tipeTransaksi) || 'Setoran';
    const nominal = roundCurrency_(payload.nominal);
    const keterangan = cleanString_(payload.keterangan);
    const member = buildMembers_().filter(function (item) {
      return item.idAnggota === idAnggota;
    })[0];

    if (!member) throw new Error('Anggota tidak ditemukan.');
    if (member.status !== 'Aktif') throw new Error('Transaksi hanya dapat dilakukan untuk anggota aktif.');
    if (nominal <= 0) throw new Error('Nominal transaksi harus lebih dari 0.');
    if (['Pokok', 'Wajib', 'Sukarela'].indexOf(jenis) === -1) throw new Error('Jenis simpanan tidak valid.');
    if (['Setoran', 'Penarikan'].indexOf(tipe) === -1) throw new Error('Tipe transaksi tidak valid.');

    if (tipe === 'Penarikan') {
      const balanceKey = {
        Pokok: 'simpananPokok',
        Wajib: 'simpananWajib',
        Sukarela: 'simpananSukarela'
      }[jenis];
      if (nominal > member[balanceKey]) {
        throw new Error('Nominal penarikan melebihi saldo simpanan ' + jenis + '.');
      }
      if (nominal > member.asetBersih) {
        throw new Error('Nominal penarikan melebihi aset bersih anggota setelah dikurangi sisa pinjaman.');
      }
    }

    const now = timestamp_();
    const idTransaksi = generateId_('SM');
    const row = {
      'ID Transaksi': idTransaksi,
      'Tanggal': tanggal,
      'ID Anggota': idAnggota,
      'Nama': member.nama,
      'Jenis Simpanan': jenis,
      'Tipe Transaksi': tipe,
      'Nominal': nominal,
      'Keterangan': keterangan,
      'Dibuat Pada': now
    };
    appendObject_(APP.sheets.simpanan, row);
    appendCash_({
      tanggal: tanggal,
      jenis: tipe === 'Setoran' ? 'Masuk' : 'Keluar',
      sumber: 'Simpanan',
      refId: idTransaksi,
      idAnggota: idAnggota,
      nama: member.nama,
      masuk: tipe === 'Setoran' ? nominal : 0,
      keluar: tipe === 'Penarikan' ? nominal : 0,
      keterangan: jenis + ' - ' + tipe + (keterangan ? ' - ' + keterangan : '')
    });
    postSavingJournal_(row);

    return {
      ok: true,
      transaction: mapSavingRows_([row])[0]
    };
  });
}

function getLoans() {
  setupDatabase();
  return mapLoanRows_(readObjects_(APP.sheets.pinjaman)).sort(sortByDateDesc_);
}

function createLoan(payload) {
  setupDatabase();
  return withLock_(function () {
    const idAnggota = cleanString_(payload.idAnggota);
    const tanggal = cleanString_(payload.tanggal) || today_();
    const pokok = roundCurrency_(payload.pokok);
    const tenor = Math.max(1, parseInt(payload.tenor, 10) || 1);
    const settings = getSettings();
    const bungaInput = payload.bungaPersen !== undefined && payload.bungaPersen !== '' ? payload.bungaPersen : settings.bungaPinjaman;
    const adminInput = payload.biayaAdmin !== undefined && payload.biayaAdmin !== '' ? payload.biayaAdmin : settings.biayaAdmin;
    const bunga = toNumber_(bungaInput);
    const admin = roundCurrency_(adminInput);
    const keterangan = cleanString_(payload.keterangan);
    const akad = cleanString_(payload.akad) || 'Murabahah';
    const program = cleanString_(payload.program);
    const tujuan = cleanString_(payload.tujuan);
    const member = buildMembers_().filter(function (item) {
      return item.idAnggota === idAnggota;
    })[0];

    if (!member) throw new Error('Anggota tidak ditemukan.');
    if (member.status !== 'Aktif') throw new Error('Pinjaman hanya dapat diajukan oleh anggota aktif.');
    if (pokok <= 0) throw new Error('Pokok pinjaman harus lebih dari 0.');
    if (tenor <= 0) throw new Error('Tenor pinjaman harus lebih dari 0.');
    if (bunga < 0) throw new Error('Bunga pinjaman tidak boleh negatif.');

    const calc = calculateLoan_(pokok, tenor, bunga, admin);
    const now = timestamp_();
    const idPinjaman = generateId_('PNJ');
    const row = {
      'ID Pinjaman': idPinjaman,
      'Tanggal': tanggal,
      'ID Anggota': idAnggota,
      'Nama': member.nama,
      'Pokok': pokok,
      'Bunga %': bunga,
      'Tenor': tenor,
      'Biaya Admin': admin,
      'Total Bunga': calc.totalBunga,
      'Total Tagihan': calc.totalTagihan,
      'Angsuran Bulanan': calc.angsuranBulanan,
      'Total Dibayar': 0,
      'Sisa Pinjaman': calc.totalTagihan,
      'Status': 'Aktif',
      'Akad': akad,
      'Program': program,
      'Tujuan': tujuan,
      'Keterangan': keterangan,
      'Dibuat Pada': now,
      'Tanggal Lunas': ''
    };
    appendObject_(APP.sheets.pinjaman, row);
    appendCash_({
      tanggal: tanggal,
      jenis: 'Keluar',
      sumber: 'Pencairan Pinjaman',
      refId: idPinjaman,
      idAnggota: idAnggota,
      nama: member.nama,
      masuk: 0,
      keluar: pokok,
      keterangan: 'Pencairan pinjaman ' + idPinjaman
    });

    if (admin > 0) {
      appendCash_({
        tanggal: tanggal,
        jenis: 'Masuk',
        sumber: 'Biaya Admin Pinjaman',
        refId: idPinjaman,
        idAnggota: idAnggota,
        nama: member.nama,
        masuk: admin,
        keluar: 0,
        keterangan: 'Biaya admin pinjaman ' + idPinjaman
      });
    }
    postLoanJournal_(row);

    return {
      ok: true,
      loan: mapLoanRows_([row])[0]
    };
  });
}

function getInstallments() {
  setupDatabase();
  return mapInstallmentRows_(readObjects_(APP.sheets.angsuran)).sort(sortByDateDesc_);
}

function payInstallment(payload) {
  setupDatabase();
  return withLock_(function () {
    const idPinjaman = cleanString_(payload.idPinjaman);
    const tanggal = cleanString_(payload.tanggal) || today_();
    const loan = findObjectById_(APP.sheets.pinjaman, 'ID Pinjaman', idPinjaman);
    if (!loan) throw new Error('Pinjaman tidak ditemukan.');
    if (loan['Status'] === 'Lunas') throw new Error('Pinjaman sudah lunas.');

    const sisa = roundCurrency_(loan['Sisa Pinjaman']);
    let nominal = roundCurrency_(payload.nominal);
    const denda = roundCurrency_(payload.denda);
    const keterangan = cleanString_(payload.keterangan);

    if (nominal <= 0) throw new Error('Nominal angsuran harus lebih dari 0.');
    if (denda < 0) throw new Error('Denda tidak boleh negatif.');
    if (nominal > sisa) nominal = sisa;

    const sisaSetelah = Math.max(0, roundCurrency_(sisa - nominal));
    const status = sisaSetelah === 0 ? 'Lunas' : 'Aktif';
    const totalBayar = roundCurrency_(nominal + denda);
    const now = timestamp_();
    const idAngsuran = generateId_('ANG');
    const row = {
      'ID Angsuran': idAngsuran,
      'Tanggal': tanggal,
      'ID Pinjaman': idPinjaman,
      'ID Anggota': loan['ID Anggota'],
      'Nama': loan['Nama'],
      'Angsuran Ke': countInstallments_(idPinjaman) + 1,
      'Nominal Pokok+Bunga': nominal,
      'Denda': denda,
      'Total Bayar': totalBayar,
      'Sisa Setelah Bayar': sisaSetelah,
      'Keterangan': keterangan,
      'Dibuat Pada': now
    };

    appendObject_(APP.sheets.angsuran, row);
    updateObject_(APP.sheets.pinjaman, loan._row, {
      'Total Dibayar': roundCurrency_(toNumber_(loan['Total Dibayar']) + nominal),
      'Sisa Pinjaman': sisaSetelah,
      'Status': status,
      'Tanggal Lunas': status === 'Lunas' ? tanggal : ''
    });
    appendCash_({
      tanggal: tanggal,
      jenis: 'Masuk',
      sumber: 'Angsuran Pinjaman',
      refId: idAngsuran,
      idAnggota: loan['ID Anggota'],
      nama: loan['Nama'],
      masuk: totalBayar,
      keluar: 0,
      keterangan: 'Pembayaran angsuran pinjaman ' + idPinjaman
    });
    postInstallmentJournal_(row, loan);

    return {
      ok: true,
      installment: mapInstallmentRows_([row])[0],
      loanStatus: status
    };
  });
}

function getFinancialReports(period) {
  setupDatabase();
  const normalizedPeriod = normalizePeriod_(period);
  const range = getPeriodRange_(normalizedPeriod);
  const cashRows = readObjects_(APP.sheets.kas);
  const saldoAwal = range.start
    ? cashRows.reduce(function (sum, row) {
      const date = parseDate_(row['Tanggal']);
      return date && date < startOfDay_(range.start)
        ? sum + toNumber_(row['Masuk']) - toNumber_(row['Keluar'])
        : sum;
    }, 0)
    : 0;
  const filteredCash = cashRows
    .filter(function (row) {
      return isInRange_(row['Tanggal'], range);
    })
    .sort(sortRawByDateAsc_);

  let running = saldoAwal;
  const rows = filteredCash.map(function (row) {
    running += toNumber_(row['Masuk']) - toNumber_(row['Keluar']);
    return {
      idKas: row['ID Kas'],
      tanggal: row['Tanggal'],
      jenisMutasi: row['Jenis Mutasi'],
      sumber: row['Sumber'],
      refId: row['Ref ID'],
      idAnggota: row['ID Anggota'],
      nama: row['Nama'],
      masuk: roundCurrency_(row['Masuk']),
      keluar: roundCurrency_(row['Keluar']),
      saldo: roundCurrency_(running),
      keterangan: row['Keterangan']
    };
  });

  const totalMasuk = rows.reduce(function (sum, row) {
    return sum + row.masuk;
  }, 0);
  const totalKeluar = rows.reduce(function (sum, row) {
    return sum + row.keluar;
  }, 0);

  const members = buildMembers_();
  const totalKas = cashRows.reduce(function (sum, row) {
    return sum + toNumber_(row['Masuk']) - toNumber_(row['Keluar']);
  }, 0);
  const totalSimpanan = members.reduce(function (sum, member) {
    return sum + member.totalSimpanan;
  }, 0);
  const piutangPinjaman = members.reduce(function (sum, member) {
    return sum + member.sisaPinjaman;
  }, 0);
  const totalAktiva = roundCurrency_(totalKas + piutangPinjaman);
  const ekuitas = roundCurrency_(totalAktiva - totalSimpanan);

  return {
    period: {
      mode: normalizedPeriod.mode,
      label: periodLabel_(normalizedPeriod, range),
      startDate: range.start ? formatDate_(range.start) : '',
      endDate: range.end ? formatDate_(range.end) : ''
    },
    mutasi: {
      saldoAwal: roundCurrency_(saldoAwal),
      totalMasuk: roundCurrency_(totalMasuk),
      totalKeluar: roundCurrency_(totalKeluar),
      saldoAkhir: roundCurrency_(saldoAwal + totalMasuk - totalKeluar),
      rows: rows
    },
    neraca: {
      aktiva: [
        { akun: 'Kas', nominal: roundCurrency_(totalKas) },
        { akun: 'Piutang Pinjaman Anggota', nominal: roundCurrency_(piutangPinjaman) }
      ],
      pasiva: [
        { akun: 'Simpanan Anggota', nominal: roundCurrency_(totalSimpanan) },
        { akun: 'Ekuitas / Saldo Usaha', nominal: ekuitas }
      ],
      totalAktiva: totalAktiva,
      totalPasiva: roundCurrency_(totalSimpanan + ekuitas)
    }
  };
}

function getAccountingData(period) {
  setupDatabase();
  const normalizedPeriod = normalizePeriod_(period);
  const range = getPeriodRange_(normalizedPeriod);
  const coa = getCoa_();
  const journalRows = readObjects_(APP.sheets.jurnal);
  const trialBalance = buildTrialBalance_(coa, journalRows, range);
  const statements = buildFinancialStatements_(trialBalance, normalizedPeriod, range);
  const cashReport = getFinancialReports(normalizedPeriod);
  const settings = getSettings();
  const netShu = statements.labaRugi.shuBersih;
  const allocation = buildShuAllocation_(netShu, settings);

  return {
    period: cashReport.period,
    coa: coa,
    accounts: coa.filter(function (item) { return item.aktif; }),
    bankAccounts: readObjects_(APP.sheets.rekening).map(mapBankAccount_),
    transactions: readObjects_(APP.sheets.transaksi).map(mapFinancialTransaction_).sort(sortByDateDesc_),
    cash: cashReport.mutasi,
    journal: journalRows
      .filter(function (row) { return isInRange_(row['Tanggal'], range); })
      .map(mapJournalRow_)
      .sort(sortByDateDesc_),
    trialBalance: trialBalance,
    neraca: statements.neraca,
    labaRugi: statements.labaRugi,
    shu: allocation,
    loans: getLoans(),
    fixedAssets: readObjects_(APP.sheets.asetTetap).map(mapFixedAsset_),
    benevolentFunds: readObjects_(APP.sheets.danaKebajikan).map(mapBenevolentFund_).sort(sortByDateDesc_),
    administration: readObjects_(APP.sheets.administrasi).map(mapAdministration_),
    checks: {
      journalDebet: trialBalance.totalMutasiDebet,
      journalKredit: trialBalance.totalMutasiKredit,
      journalDifference: roundCurrency_(trialBalance.totalMutasiDebet - trialBalance.totalMutasiKredit),
      balanceDifference: roundCurrency_(statements.neraca.totalAset - statements.neraca.totalKewajibanEkuitas),
      unclassifiedCount: journalRows.filter(function (row) { return row['Kode Akun'] === '3199'; }).length
    }
  };
}

function saveCoaAccount(payload) {
  setupDatabase();
  return withLock_(function () {
    const code = cleanString_(payload.kodeAkun);
    const name = cleanString_(payload.namaAkun);
    if (!code || !name) throw new Error('Kode dan nama akun wajib diisi.');
    const existing = findObjectById_(APP.sheets.coa, 'Kode Akun', code);
    const row = {
      'Kode Akun': code,
      'Nama Akun': name,
      'Kategori': cleanString_(payload.kategori) || 'ASET',
      'Normal': cleanString_(payload.normal) || 'DEBET',
      'Laporan': cleanString_(payload.laporan) || 'NERACA',
      'Grup': cleanString_(payload.grup),
      'Aktif': cleanString_(payload.aktif) || 'Ya',
      'Keterangan': cleanString_(payload.keterangan)
    };
    if (existing) updateObject_(APP.sheets.coa, existing._row, row);
    else appendObject_(APP.sheets.coa, row);
    return { ok: true, account: mapCoaRow_(row) };
  });
}

function saveBankAccount(payload) {
  setupDatabase();
  return withLock_(function () {
    const id = cleanString_(payload.idRekening) || generateId_('REK');
    const code = cleanString_(payload.kodeAkun);
    const name = cleanString_(payload.namaRekening);
    if (!code || !name) throw new Error('Nama rekening dan kode akun wajib diisi.');
    if (!getCoaByCode_(code)) throw new Error('Kode akun rekening tidak ditemukan di COA.');
    const existing = findObjectById_(APP.sheets.rekening, 'ID Rekening', id);
    const opening = roundCurrency_(payload.saldoAwal);
    const row = {
      'ID Rekening': id,
      'Nama Rekening': name,
      'Bank': cleanString_(payload.bank),
      'Nomor Rekening': cleanString_(payload.nomorRekening),
      'Kode Akun': code,
      'Saldo Awal': opening,
      'Aktif': cleanString_(payload.aktif) || 'Ya',
      'Keterangan': cleanString_(payload.keterangan)
    };
    if (existing) updateObject_(APP.sheets.rekening, existing._row, row);
    else {
      appendObject_(APP.sheets.rekening, row);
      if (opening > 0) {
        postJournal_('Saldo Awal', id, today_(), 'SALDO-AWAL-' + id, 'Saldo awal ' + name, [
          { code: code, debit: opening, credit: 0 },
          { code: '3199', debit: 0, credit: opening }
        ]);
      }
    }
    return { ok: true, bankAccount: mapBankAccount_(row) };
  });
}

function saveFinancialTransaction(payload) {
  setupDatabase();
  return withLock_(function () {
    const id = generateId_('TRX');
    const date = cleanString_(payload.tanggal) || today_();
    const type = cleanString_(payload.jenis) || 'Keluar';
    const bankCode = cleanString_(payload.kodeRekening) || getSettings().rekeningUtama || '1112';
    const contraCode = cleanString_(payload.kodeLawanAkun);
    const amount = roundCurrency_(payload.nominal);
    const voucher = cleanString_(payload.noBukti) || id;
    const memo = cleanString_(payload.keterangan);
    if (amount <= 0) throw new Error('Nominal harus lebih dari 0.');
    if (!getCoaByCode_(bankCode) || !getCoaByCode_(contraCode)) throw new Error('Akun rekening atau akun lawan tidak valid.');
    if (['Masuk', 'Keluar', 'Transfer'].indexOf(type) === -1) throw new Error('Jenis transaksi tidak valid.');

    const row = {
      'ID Transaksi': id,
      'Tanggal': date,
      'No Bukti': voucher,
      'Jenis': type,
      'Kode Rekening': bankCode,
      'Kode Lawan Akun': contraCode,
      'Nominal': amount,
      'Pihak': cleanString_(payload.pihak),
      'Keterangan': memo,
      'Ref ID': cleanString_(payload.refId),
      'Dibuat Pada': timestamp_()
    };
    appendObject_(APP.sheets.transaksi, row);

    if (type === 'Masuk') {
      appendCash_({ tanggal: date, jenis: 'Masuk', sumber: 'Transaksi Keuangan', refId: id, nama: row['Pihak'], masuk: amount, keluar: 0, keterangan: memo });
      postJournal_('Transaksi Keuangan', id, date, voucher, memo, [
        { code: bankCode, debit: amount, credit: 0 },
        { code: contraCode, debit: 0, credit: amount }
      ]);
    } else if (type === 'Keluar') {
      appendCash_({ tanggal: date, jenis: 'Keluar', sumber: 'Transaksi Keuangan', refId: id, nama: row['Pihak'], masuk: 0, keluar: amount, keterangan: memo });
      postJournal_('Transaksi Keuangan', id, date, voucher, memo, [
        { code: contraCode, debit: amount, credit: 0 },
        { code: bankCode, debit: 0, credit: amount }
      ]);
    } else {
      appendCash_({ tanggal: date, jenis: 'Keluar', sumber: 'Transfer Keluar', refId: id, masuk: 0, keluar: amount, keterangan: memo });
      appendCash_({ tanggal: date, jenis: 'Masuk', sumber: 'Transfer Masuk', refId: id, masuk: amount, keluar: 0, keterangan: memo });
      postJournal_('Transfer Bank', id, date, voucher, memo, [
        { code: contraCode, debit: amount, credit: 0 },
        { code: bankCode, debit: 0, credit: amount }
      ]);
    }
    return { ok: true, transaction: mapFinancialTransaction_(row) };
  });
}

function saveFixedAsset(payload) {
  setupDatabase();
  return withLock_(function () {
    const id = cleanString_(payload.idAset) || generateId_('AST');
    const cost = roundCurrency_(payload.nilaiPerolehan);
    const residual = roundCurrency_(payload.nilaiResidu);
    const life = Math.max(1, parseInt(payload.umurBulan, 10) || 1);
    const accumulated = roundCurrency_(payload.akumulasiPenyusutan);
    if (!cleanString_(payload.namaAset) || cost <= 0) throw new Error('Nama dan nilai perolehan aset wajib diisi.');
    const row = {
      'ID Aset': id,
      'Tanggal Perolehan': cleanString_(payload.tanggalPerolehan) || today_(),
      'Nama Aset': cleanString_(payload.namaAset),
      'Kategori': cleanString_(payload.kategori) || 'Inventaris',
      'Kode Akun Aset': cleanString_(payload.kodeAkunAset) || '1311',
      'Kode Akun Akumulasi': cleanString_(payload.kodeAkunAkumulasi) || '1391',
      'Kode Akun Beban': cleanString_(payload.kodeAkunBeban) || '5116',
      'Nilai Perolehan': cost,
      'Nilai Residu': residual,
      'Umur Bulan': life,
      'Akumulasi Penyusutan': accumulated,
      'Nilai Buku': roundCurrency_(cost - accumulated),
      'Status': cleanString_(payload.status) || 'Aktif',
      'Keterangan': cleanString_(payload.keterangan)
    };
    const existing = findObjectById_(APP.sheets.asetTetap, 'ID Aset', id);
    if (existing) updateObject_(APP.sheets.asetTetap, existing._row, row);
    else {
      appendObject_(APP.sheets.asetTetap, row);
      if (payload.bayarSekarang === true || payload.bayarSekarang === 'on' || payload.bayarSekarang === 'Ya') {
        const cashCode = getSettings().rekeningUtama || '1112';
        appendCash_({ tanggal: row['Tanggal Perolehan'], jenis: 'Keluar', sumber: 'Pembelian Aset Tetap', refId: id, masuk: 0, keluar: cost, keterangan: row['Nama Aset'] });
        postJournal_('Aset Tetap', id, row['Tanggal Perolehan'], id, row['Nama Aset'], [
          { code: row['Kode Akun Aset'], debit: cost, credit: 0 },
          { code: cashCode, debit: 0, credit: cost }
        ]);
      }
    }
    return { ok: true, asset: mapFixedAsset_(row) };
  });
}

function saveBenevolentFund(payload) {
  setupDatabase();
  return withLock_(function () {
    const id = generateId_('DKB');
    const date = cleanString_(payload.tanggal) || today_();
    const type = cleanString_(payload.jenis) || 'Sumber';
    const amount = roundCurrency_(payload.nominal);
    const bankCode = cleanString_(payload.kodeRekening) || getSettings().rekeningUtama || '1112';
    if (amount <= 0) throw new Error('Nominal dana kebajikan harus lebih dari 0.');
    const row = {
      'ID Transaksi': id,
      'Tanggal': date,
      'Jenis': type,
      'Sumber/Penggunaan': cleanString_(payload.sumberPenggunaan),
      'Nominal': amount,
      'No Bukti': cleanString_(payload.noBukti) || id,
      'Keterangan': cleanString_(payload.keterangan),
      'Dibuat Pada': timestamp_()
    };
    appendObject_(APP.sheets.danaKebajikan, row);
    if (type === 'Sumber') {
      appendCash_({ tanggal: date, jenis: 'Masuk', sumber: 'Dana Kebajikan', refId: id, masuk: amount, keluar: 0, keterangan: row['Keterangan'] });
      postJournal_('Dana Kebajikan', id, date, row['No Bukti'], row['Keterangan'], [
        { code: bankCode, debit: amount, credit: 0 },
        { code: '4114', debit: 0, credit: amount }
      ]);
    } else {
      appendCash_({ tanggal: date, jenis: 'Keluar', sumber: 'Dana Kebajikan', refId: id, masuk: 0, keluar: amount, keterangan: row['Keterangan'] });
      postJournal_('Dana Kebajikan', id, date, row['No Bukti'], row['Keterangan'], [
        { code: '6111', debit: amount, credit: 0 },
        { code: bankCode, debit: 0, credit: amount }
      ]);
    }
    return { ok: true, transaction: mapBenevolentFund_(row) };
  });
}

function saveAdministrationDocument(payload) {
  setupDatabase();
  return withLock_(function () {
    const id = cleanString_(payload.idDokumen) || generateId_('ADM');
    const row = {
      'ID Dokumen': id,
      'Jenis Dokumen': cleanString_(payload.jenisDokumen),
      'Nomor': cleanString_(payload.nomor),
      'Tanggal': cleanString_(payload.tanggal) || today_(),
      'Berlaku Sampai': cleanString_(payload.berlakuSampai),
      'Penanggung Jawab': cleanString_(payload.penanggungJawab),
      'Status': cleanString_(payload.status) || 'Aktif',
      'Link Dokumen': cleanString_(payload.linkDokumen),
      'Keterangan': cleanString_(payload.keterangan)
    };
    if (!row['Jenis Dokumen']) throw new Error('Jenis dokumen wajib diisi.');
    const existing = findObjectById_(APP.sheets.administrasi, 'ID Dokumen', id);
    if (existing) updateObject_(APP.sheets.administrasi, existing._row, row);
    else appendObject_(APP.sheets.administrasi, row);
    return { ok: true, document: mapAdministration_(row) };
  });
}

function synchronizeOperationalJournals() {
  setupDatabase();
  return withLock_(function () {
    let posted = 0;
    readObjects_(APP.sheets.simpanan).forEach(function (row) {
      if (!hasJournalRef_('Simpanan', row['ID Transaksi'])) {
        postSavingJournal_(row);
        posted++;
      }
    });
    readObjects_(APP.sheets.pinjaman).forEach(function (row) {
      if (!hasJournalRef_('Pembiayaan', row['ID Pinjaman'])) {
        postLoanJournal_(row);
        posted++;
      }
    });
    const loans = {};
    readObjects_(APP.sheets.pinjaman).forEach(function (row) { loans[row['ID Pinjaman']] = row; });
    readObjects_(APP.sheets.angsuran).forEach(function (row) {
      if (!hasJournalRef_('Angsuran', row['ID Angsuran'])) {
        postInstallmentJournal_(row, loans[row['ID Pinjaman']] || {});
        posted++;
      }
    });
    return { ok: true, posted: posted, message: posted ? posted + ' transaksi berhasil dijurnal.' : 'Semua transaksi operasional sudah tersinkron.' };
  });
}

function downloadFinancialReportExcel(period) {
  setupDatabase();
  const report = getAccountingData(period);
  const settings = getSettings();
  const temp = SpreadsheetApp.create('Laporan Keuangan ' + (settings.namaKoperasi || 'Koperasi'));
  const defaultSheet = temp.getSheets()[0];
  defaultSheet.setName('Ringkasan');

  writeReportSheet_(defaultSheet, [
    ['LAPORAN KEUANGAN', settings.namaKoperasi || 'Koperasi'],
    ['Periode', report.period.label],
    ['Status Jurnal', report.checks.journalDifference === 0 ? 'BALANCE' : 'SELISIH'],
    ['Selisih Neraca', report.checks.balanceDifference],
    [],
    ['SHU Bersih', report.labaRugi.shuBersih],
    ['Total Aset', report.neraca.totalAset],
    ['Total Kewajiban dan Ekuitas', report.neraca.totalKewajibanEkuitas]
  ]);
  addExportSheet_(temp, 'COA', [['Kode Akun', 'Nama Akun', 'Kategori', 'Normal', 'Laporan', 'Grup', 'Aktif', 'Keterangan']].concat(report.coa.map(function (r) {
    return [r.kodeAkun, r.namaAkun, r.kategori, r.normal, r.laporan, r.grup, r.aktif ? 'Ya' : 'Tidak', r.keterangan];
  })));
  addExportSheet_(temp, 'Rincian Kas', [['Tanggal', 'Sumber', 'Ref', 'Anggota/Pihak', 'Masuk', 'Keluar', 'Saldo', 'Keterangan']].concat(report.cash.rows.map(function (r) {
    return [r.tanggal, r.sumber, r.refId, r.nama, r.masuk, r.keluar, r.saldo, r.keterangan];
  })));
  addExportSheet_(temp, 'Jurnal', [['Tanggal', 'No Bukti', 'Sumber', 'Ref ID', 'Kode Akun', 'Nama Akun', 'Debet', 'Kredit', 'Memo']].concat(report.journal.map(function (r) {
    return [r.tanggal, r.noBukti, r.sumber, r.refId, r.kodeAkun, r.namaAkun, r.debet, r.kredit, r.memo];
  })));
  addExportSheet_(temp, 'TB', [['Kode', 'Akun', 'Saldo Awal D', 'Saldo Awal K', 'Mutasi D', 'Mutasi K', 'Saldo Akhir D', 'Saldo Akhir K']].concat(report.trialBalance.rows.map(function (r) {
    return [r.kodeAkun, r.namaAkun, r.saldoAwalDebet, r.saldoAwalKredit, r.mutasiDebet, r.mutasiKredit, r.saldoAkhirDebet, r.saldoAkhirKredit];
  })));
  addExportSheet_(temp, 'Neraca', [['Kategori', 'Grup', 'Akun', 'Nominal']].concat(
    report.neraca.aset.map(function (r) { return ['ASET', r.grup, r.akun, r.nominal]; })
      .concat(report.neraca.kewajiban.map(function (r) { return ['KEWAJIBAN', r.grup, r.akun, r.nominal]; }))
      .concat(report.neraca.ekuitas.map(function (r) { return ['EKUITAS', r.grup, r.akun, r.nominal]; }))
      .concat([['TOTAL', '', 'Total Aset', report.neraca.totalAset], ['TOTAL', '', 'Total Kewajiban dan Ekuitas', report.neraca.totalKewajibanEkuitas]])
  ));
  addExportSheet_(temp, 'Laba Rugi', [['Kategori', 'Grup', 'Akun', 'Nominal']].concat(
    report.labaRugi.pendapatan.map(function (r) { return ['PENDAPATAN', r.grup, r.akun, r.nominal]; })
      .concat(report.labaRugi.beban.map(function (r) { return ['BEBAN', r.grup, r.akun, r.nominal]; }))
      .concat([['TOTAL', '', 'SHU Bersih', report.labaRugi.shuBersih]])
  ));
  addExportSheet_(temp, 'Rincian Pinjaman', [['Tanggal', 'ID Pinjaman', 'Anggota', 'Akad', 'Program', 'Tujuan', 'Pokok', 'Margin', 'Total Tagihan', 'Sisa', 'Status']].concat(report.loans.map(function (r) {
    return [r.tanggal, r.idPinjaman, r.nama, r.akad, r.program, r.tujuan, r.pokok, r.totalBunga, r.totalTagihan, r.sisaPinjaman, r.status];
  })));
  addExportSheet_(temp, 'Pembagian SHU', [['Pos', 'Persentase', 'Jumlah']].concat(report.shu.rows.map(function (r) {
    return [r.pos, r.persentase, r.jumlah];
  })));
  addExportSheet_(temp, 'Aset Tetap', [['ID', 'Tanggal', 'Nama', 'Kategori', 'Nilai Perolehan', 'Akumulasi', 'Nilai Buku', 'Status']].concat(report.fixedAssets.map(function (r) {
    return [r.idAset, r.tanggalPerolehan, r.namaAset, r.kategori, r.nilaiPerolehan, r.akumulasiPenyusutan, r.nilaiBuku, r.status];
  })));
  addExportSheet_(temp, 'Dana Kebajikan', [['Tanggal', 'Jenis', 'Sumber/Penggunaan', 'Nominal', 'No Bukti', 'Keterangan']].concat(report.benevolentFunds.map(function (r) {
    return [r.tanggal, r.jenis, r.sumberPenggunaan, r.nominal, r.noBukti, r.keterangan];
  })));
  addExportSheet_(temp, 'Administrasi', [['Jenis Dokumen', 'Nomor', 'Tanggal', 'Berlaku Sampai', 'Penanggung Jawab', 'Status', 'Link', 'Keterangan']].concat(report.administration.map(function (r) {
    return [r.jenisDokumen, r.nomor, r.tanggal, r.berlakuSampai, r.penanggungJawab, r.status, r.linkDokumen, r.keterangan];
  })));

  SpreadsheetApp.flush();
  const url = 'https://docs.google.com/spreadsheets/d/' + temp.getId() + '/export?format=xlsx';
  const response = UrlFetchApp.fetch(url, { headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() } });
  const filename = 'Laporan Keuangan ' + (settings.namaKoperasi || 'Koperasi') + ' - ' + report.period.label.replace(/[^\w\- ]/g, '') + '.xlsx';
  DriveApp.getFileById(temp.getId()).setTrashed(true);
  return {
    filename: filename,
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    base64: Utilities.base64Encode(response.getBlob().getBytes())
  };
}

function getSettings() {
  setupDatabaseLite_();
  const rows = readObjects_(APP.sheets.pengaturan);
  const settings = {};
  APP.defaults.forEach(function (entry) {
    settings[entry[0]] = entry[1];
  });
  rows.forEach(function (row) {
    if (row.Key) settings[row.Key] = row.Value;
  });
  settings.bungaPinjaman = toNumber_(settings.bungaPinjaman);
  settings.biayaAdmin = roundCurrency_(settings.biayaAdmin);
  settings.persenCadangan = toNumber_(settings.persenCadangan);
  settings.persenJasaSimpanan = toNumber_(settings.persenJasaSimpanan);
  settings.persenPartisipasi = toNumber_(settings.persenPartisipasi);
  settings.persenPengelola = toNumber_(settings.persenPengelola);
  settings.persenSosial = toNumber_(settings.persenSosial);
  return settings;
}

function saveSettings(payload) {
  setupDatabase();
  return withLock_(function () {
    const allowed = [
      'namaKoperasi',
      'alamatKoperasi',
      'logoUrl',
      'bungaPinjaman',
      'biayaAdmin',
      'mataUang',
      'rekeningUtama',
      'persenCadangan',
      'persenJasaSimpanan',
      'persenPartisipasi',
      'persenPengelola',
      'persenSosial'
    ];
    const settingsSheet = getSheet_(APP.sheets.pengaturan);
    const current = readObjects_(APP.sheets.pengaturan);

    allowed.forEach(function (key) {
      if (payload[key] === undefined) return;
      const existing = current.filter(function (row) {
        return row.Key === key;
      })[0];
      const value = key === 'bungaPinjaman' ? toNumber_(payload[key]) : payload[key];
      if (existing) {
        updateObject_(APP.sheets.pengaturan, existing._row, { Value: value });
      } else {
        const defaultEntry = APP.defaults.filter(function (entry) {
          return entry[0] === key;
        })[0] || [key, '', key];
        settingsSheet.appendRow([key, value, defaultEntry[2]]);
      }
    });

    return {
      ok: true,
      settings: getSettings()
    };
  });
}

function downloadReceiptPdf(type, id) {
  setupDatabase();
  const receipt = getReceiptData_(type, id);
  const settings = getSettings();
  const html = buildReceiptHtml_(settings, receipt);
  const filename = receipt.filename + '.pdf';
  const pdf = Utilities
    .newBlob(html, 'text/html', receipt.filename + '.html')
    .getAs('application/pdf')
    .setName(filename);

  return {
    filename: filename,
    mimeType: 'application/pdf',
    base64: Utilities.base64Encode(pdf.getBytes())
  };
}

function calculateLoan_(pokok, tenor, bunga, admin) {
  const totalBunga = roundCurrency_(pokok * (bunga / 100) * tenor);
  const totalTagihan = roundCurrency_(pokok + totalBunga);
  return {
    totalBunga: totalBunga,
    totalTagihan: totalTagihan,
    angsuranBulanan: roundCurrency_(totalTagihan / tenor),
    biayaAdmin: roundCurrency_(admin)
  };
}

function buildMembers_() {
  const members = readObjects_(APP.sheets.anggota);
  const savings = readObjects_(APP.sheets.simpanan);
  const loans = readObjects_(APP.sheets.pinjaman);
  const balances = {};

  members.forEach(function (member) {
    const id = member['ID Anggota'];
    balances[id] = {
      simpananPokok: 0,
      simpananWajib: 0,
      simpananSukarela: 0,
      sisaPinjaman: 0
    };
  });

  savings.forEach(function (row) {
    const id = row['ID Anggota'];
    if (!balances[id]) {
      balances[id] = {
        simpananPokok: 0,
        simpananWajib: 0,
        simpananSukarela: 0,
        sisaPinjaman: 0
      };
    }
    const key = {
      Pokok: 'simpananPokok',
      Wajib: 'simpananWajib',
      Sukarela: 'simpananSukarela'
    }[row['Jenis Simpanan']];
    if (!key) return;
    const sign = row['Tipe Transaksi'] === 'Penarikan' ? -1 : 1;
    balances[id][key] += sign * toNumber_(row['Nominal']);
  });

  loans.forEach(function (row) {
    const id = row['ID Anggota'];
    if (!balances[id]) {
      balances[id] = {
        simpananPokok: 0,
        simpananWajib: 0,
        simpananSukarela: 0,
        sisaPinjaman: 0
      };
    }
    if (row['Status'] !== 'Lunas') {
      balances[id].sisaPinjaman += toNumber_(row['Sisa Pinjaman']);
    }
  });

  return members.map(function (row) {
    const id = row['ID Anggota'];
    const balance = balances[id] || {};
    const simpananPokok = roundCurrency_(balance.simpananPokok);
    const simpananWajib = roundCurrency_(balance.simpananWajib);
    const simpananSukarela = roundCurrency_(balance.simpananSukarela);
    const totalSimpanan = roundCurrency_(simpananPokok + simpananWajib + simpananSukarela);
    const sisaPinjaman = roundCurrency_(balance.sisaPinjaman);
    return {
      idAnggota: id,
      nama: row['Nama'],
      kategori: row['Kategori'] || 'Mahasiswa',
      identitas: row['Identitas'],
      email: row['Email'],
      telepon: row['Telepon'],
      alamat: row['Alamat'],
      tanggalBergabung: row['Tanggal Bergabung'],
      status: row['Status'] || 'Aktif',
      tanggalKeluar: row['Tanggal Keluar'],
      catatan: row['Catatan'],
      simpananPokok: simpananPokok,
      simpananWajib: simpananWajib,
      simpananSukarela: simpananSukarela,
      totalSimpanan: totalSimpanan,
      sisaPinjaman: sisaPinjaman,
      asetBersih: roundCurrency_(totalSimpanan - sisaPinjaman)
    };
  });
}

function getSavingsComposition_(members) {
  const pokok = members.reduce(function (sum, item) {
    return sum + item.simpananPokok;
  }, 0);
  const wajib = members.reduce(function (sum, item) {
    return sum + item.simpananWajib;
  }, 0);
  const sukarela = members.reduce(function (sum, item) {
    return sum + item.simpananSukarela;
  }, 0);
  return {
    labels: ['Pokok', 'Wajib', 'Sukarela'],
    values: [roundCurrency_(pokok), roundCurrency_(wajib), roundCurrency_(sukarela)]
  };
}

function buildMonthlyCashFlow_(cashRows, range) {
  const grouped = {};
  cashRows
    .filter(function (row) {
      return isInRange_(row['Tanggal'], range);
    })
    .forEach(function (row) {
      const key = monthKey_(parseDate_(row['Tanggal']));
      if (!key) return;
      if (!grouped[key]) grouped[key] = { masuk: 0, keluar: 0 };
      grouped[key].masuk += toNumber_(row['Masuk']);
      grouped[key].keluar += toNumber_(row['Keluar']);
    });

  let keys = [];
  if (range.start && range.end) {
    let cursor = new Date(range.start.getFullYear(), range.start.getMonth(), 1);
    const end = new Date(range.end.getFullYear(), range.end.getMonth(), 1);
    while (cursor <= end) {
      keys.push(monthKey_(cursor));
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    }
  } else {
    keys = Object.keys(grouped).sort();
  }
  if (keys.length === 0) keys = [monthKey_(new Date())];

  return {
    labels: keys.map(monthLabel_),
    masuk: keys.map(function (key) {
      return roundCurrency_(grouped[key] ? grouped[key].masuk : 0);
    }),
    keluar: keys.map(function (key) {
      return roundCurrency_(grouped[key] ? grouped[key].keluar : 0);
    })
  };
}

function mapSavingRows_(rows) {
  return rows.map(function (row) {
    return {
      idTransaksi: row['ID Transaksi'],
      tanggal: row['Tanggal'],
      idAnggota: row['ID Anggota'],
      nama: row['Nama'],
      jenisSimpanan: row['Jenis Simpanan'],
      tipeTransaksi: row['Tipe Transaksi'],
      nominal: roundCurrency_(row['Nominal']),
      keterangan: row['Keterangan'],
      dibuatPada: row['Dibuat Pada']
    };
  });
}

function mapLoanRows_(rows) {
  return rows.map(function (row) {
    return {
      idPinjaman: row['ID Pinjaman'],
      tanggal: row['Tanggal'],
      idAnggota: row['ID Anggota'],
      nama: row['Nama'],
      pokok: roundCurrency_(row['Pokok']),
      bungaPersen: toNumber_(row['Bunga %']),
      tenor: toNumber_(row['Tenor']),
      biayaAdmin: roundCurrency_(row['Biaya Admin']),
      totalBunga: roundCurrency_(row['Total Bunga']),
      totalTagihan: roundCurrency_(row['Total Tagihan']),
      angsuranBulanan: roundCurrency_(row['Angsuran Bulanan']),
      totalDibayar: roundCurrency_(row['Total Dibayar']),
      sisaPinjaman: roundCurrency_(row['Sisa Pinjaman']),
      status: row['Status'],
      akad: row['Akad'] || 'Murabahah',
      program: row['Program'],
      tujuan: row['Tujuan'],
      keterangan: row['Keterangan'],
      dibuatPada: row['Dibuat Pada'],
      tanggalLunas: row['Tanggal Lunas']
    };
  });
}

function mapInstallmentRows_(rows) {
  return rows.map(function (row) {
    return {
      idAngsuran: row['ID Angsuran'],
      tanggal: row['Tanggal'],
      idPinjaman: row['ID Pinjaman'],
      idAnggota: row['ID Anggota'],
      nama: row['Nama'],
      angsuranKe: toNumber_(row['Angsuran Ke']),
      nominal: roundCurrency_(row['Nominal Pokok+Bunga']),
      denda: roundCurrency_(row['Denda']),
      totalBayar: roundCurrency_(row['Total Bayar']),
      sisaSetelahBayar: roundCurrency_(row['Sisa Setelah Bayar']),
      keterangan: row['Keterangan'],
      dibuatPada: row['Dibuat Pada']
    };
  });
}

function mapCashRows_(rows) {
  return rows.map(function (row) {
    return {
      idKas: row['ID Kas'],
      tanggal: row['Tanggal'],
      jenisMutasi: row['Jenis Mutasi'],
      sumber: row['Sumber'],
      refId: row['Ref ID'],
      idAnggota: row['ID Anggota'],
      nama: row['Nama'],
      masuk: roundCurrency_(row['Masuk']),
      keluar: roundCurrency_(row['Keluar']),
      keterangan: row['Keterangan'],
      dibuatPada: row['Dibuat Pada']
    };
  });
}

function appendCash_(payload) {
  appendObject_(APP.sheets.kas, {
    'ID Kas': generateId_('KAS'),
    'Tanggal': payload.tanggal || today_(),
    'Jenis Mutasi': payload.jenis,
    'Sumber': payload.sumber,
    'Ref ID': payload.refId,
    'ID Anggota': payload.idAnggota || '',
    'Nama': payload.nama || '',
    'Masuk': roundCurrency_(payload.masuk),
    'Keluar': roundCurrency_(payload.keluar),
    'Keterangan': payload.keterangan || '',
    'Dibuat Pada': timestamp_()
  });
}

function postSavingJournal_(row) {
  const amount = roundCurrency_(row['Nominal']);
  if (amount <= 0) return;
  const cashCode = getSettings().rekeningUtama || '1112';
  const savingCode = { Pokok: '3111', Wajib: '3112', Sukarela: '2211' }[row['Jenis Simpanan']] || '2211';
  const deposit = row['Tipe Transaksi'] !== 'Penarikan';
  postJournal_('Simpanan', row['ID Transaksi'], row['Tanggal'], row['ID Transaksi'], row['Keterangan'], deposit
    ? [{ code: cashCode, debit: amount, credit: 0 }, { code: savingCode, debit: 0, credit: amount }]
    : [{ code: savingCode, debit: amount, credit: 0 }, { code: cashCode, debit: 0, credit: amount }]);
}

function postLoanJournal_(row) {
  const principal = roundCurrency_(row['Pokok']);
  const margin = roundCurrency_(row['Total Bunga']);
  const total = roundCurrency_(row['Total Tagihan']) || roundCurrency_(principal + margin);
  const admin = roundCurrency_(row['Biaya Admin']);
  if (principal <= 0) return;
  const cashCode = getSettings().rekeningUtama || '1112';
  const receivableCode = loanReceivableCode_(row['Akad']);
  const lines = [
    { code: receivableCode, debit: total, credit: 0 },
    { code: cashCode, debit: 0, credit: principal }
  ];
  if (margin > 0) lines.push({ code: '1129', debit: 0, credit: margin });
  if (admin > 0) {
    lines.push({ code: cashCode, debit: admin, credit: 0 });
    lines.push({ code: '4113', debit: 0, credit: admin });
  }
  postJournal_('Pembiayaan', row['ID Pinjaman'], row['Tanggal'], row['ID Pinjaman'], row['Keterangan'], lines);
}

function postInstallmentJournal_(row, loan) {
  const nominal = roundCurrency_(row['Nominal Pokok+Bunga']);
  const fine = roundCurrency_(row['Denda']);
  if (nominal <= 0 && fine <= 0) return;
  const totalBill = roundCurrency_(loan['Total Tagihan']);
  const totalMargin = roundCurrency_(loan['Total Bunga']);
  const marginPart = totalBill > 0 ? roundCurrency_(nominal * totalMargin / totalBill) : 0;
  const cashCode = getSettings().rekeningUtama || '1112';
  const receivableCode = loanReceivableCode_(loan['Akad']);
  const lines = [
    { code: cashCode, debit: roundCurrency_(nominal + fine), credit: 0 },
    { code: receivableCode, debit: 0, credit: nominal }
  ];
  if (marginPart > 0) {
    lines.push({ code: '1129', debit: marginPart, credit: 0 });
    lines.push({ code: loanMarginIncomeCode_(loan['Akad']), debit: 0, credit: marginPart });
  }
  if (fine > 0) lines.push({ code: '4114', debit: 0, credit: fine });
  postJournal_('Angsuran', row['ID Angsuran'], row['Tanggal'], row['ID Angsuran'], row['Keterangan'], lines);
}

function postJournal_(source, refId, date, voucher, memo, lines) {
  if (!refId || hasJournalRef_(source, refId)) return false;
  const cleanLines = (lines || []).filter(function (line) {
    return roundCurrency_(line.debit) !== 0 || roundCurrency_(line.credit) !== 0;
  });
  const totalDebit = roundCurrency_(cleanLines.reduce(function (sum, line) { return sum + roundCurrency_(line.debit); }, 0));
  const totalCredit = roundCurrency_(cleanLines.reduce(function (sum, line) { return sum + roundCurrency_(line.credit); }, 0));
  if (Math.abs(totalDebit - totalCredit) > 1) {
    throw new Error('Jurnal tidak seimbang untuk ' + source + ' ' + refId + '.');
  }
  const journalId = generateId_('JRN');
  const now = timestamp_();
  cleanLines.forEach(function (line) {
    const account = getCoaByCode_(line.code);
    if (!account) throw new Error('Kode akun ' + line.code + ' belum tersedia di COA.');
    appendObject_(APP.sheets.jurnal, {
      'ID Jurnal': journalId,
      'Tanggal': date || today_(),
      'No Bukti': voucher || refId,
      'Sumber': source,
      'Ref ID': refId,
      'Kode Akun': line.code,
      'Nama Akun': account.namaAkun,
      'Debet': roundCurrency_(line.debit),
      'Kredit': roundCurrency_(line.credit),
      'Memo': memo || '',
      'Dibuat Pada': now
    });
  });
  return true;
}

function hasJournalRef_(source, refId) {
  return readObjects_(APP.sheets.jurnal).some(function (row) {
    return row['Sumber'] === source && row['Ref ID'] === refId;
  });
}

function loanReceivableCode_(akad) {
  const value = cleanString_(akad).toLowerCase();
  if (value.indexOf('qard') !== -1) return '1121';
  if (value.indexOf('ijarah') !== -1 || value.indexOf('multijasa') !== -1) return '1123';
  return '1122';
}

function loanMarginIncomeCode_(akad) {
  const value = cleanString_(akad).toLowerCase();
  return value.indexOf('ijarah') !== -1 || value.indexOf('multijasa') !== -1 ? '4112' : '4111';
}

function getCoa_() {
  return readObjects_(APP.sheets.coa).map(mapCoaRow_).sort(function (a, b) {
    return String(a.kodeAkun).localeCompare(String(b.kodeAkun));
  });
}

function getCoaByCode_(code) {
  return getCoa_().filter(function (item) { return item.kodeAkun === cleanString_(code); })[0];
}

function buildTrialBalance_(coa, journalRows, range) {
  const balances = {};
  coa.forEach(function (account) {
    balances[account.kodeAkun] = {
      account: account,
      openingDebit: 0,
      openingCredit: 0,
      debit: 0,
      credit: 0,
      closingDebit: 0,
      closingCredit: 0
    };
  });
  journalRows.forEach(function (row) {
    const code = cleanString_(row['Kode Akun']);
    if (!balances[code]) return;
    const date = parseDate_(row['Tanggal']);
    if (!date) return;
    const debit = roundCurrency_(row['Debet']);
    const credit = roundCurrency_(row['Kredit']);
    if (range.start && date < startOfDay_(range.start)) {
      balances[code].openingDebit += debit;
      balances[code].openingCredit += credit;
    } else if (isInRange_(date, range)) {
      balances[code].debit += debit;
      balances[code].credit += credit;
    }
  });

  const rows = Object.keys(balances).map(function (code) {
    const item = balances[code];
    const openingNet = roundCurrency_(item.openingDebit - item.openingCredit);
    const closingNet = roundCurrency_(openingNet + item.debit - item.credit);
    return {
      kodeAkun: code,
      namaAkun: item.account.namaAkun,
      kategori: item.account.kategori,
      normal: item.account.normal,
      laporan: item.account.laporan,
      grup: item.account.grup,
      saldoAwalDebet: openingNet >= 0 ? openingNet : 0,
      saldoAwalKredit: openingNet < 0 ? Math.abs(openingNet) : 0,
      mutasiDebet: roundCurrency_(item.debit),
      mutasiKredit: roundCurrency_(item.credit),
      saldoAkhirDebet: closingNet >= 0 ? closingNet : 0,
      saldoAkhirKredit: closingNet < 0 ? Math.abs(closingNet) : 0,
      saldoNormal: roundCurrency_(item.account.normal === 'KREDIT' ? -closingNet : closingNet),
      mutasiNormal: roundCurrency_(item.account.normal === 'KREDIT' ? item.credit - item.debit : item.debit - item.credit)
    };
  }).filter(function (row) {
    return row.saldoAwalDebet || row.saldoAwalKredit || row.mutasiDebet || row.mutasiKredit || row.saldoAkhirDebet || row.saldoAkhirKredit;
  });
  return {
    rows: rows,
    totalSaldoAwalDebet: sumField_(rows, 'saldoAwalDebet'),
    totalSaldoAwalKredit: sumField_(rows, 'saldoAwalKredit'),
    totalMutasiDebet: sumField_(rows, 'mutasiDebet'),
    totalMutasiKredit: sumField_(rows, 'mutasiKredit'),
    totalSaldoAkhirDebet: sumField_(rows, 'saldoAkhirDebet'),
    totalSaldoAkhirKredit: sumField_(rows, 'saldoAkhirKredit')
  };
}

function buildFinancialStatements_(trialBalance) {
  const incomeRows = trialBalance.rows.filter(function (row) { return row.kategori === 'PENDAPATAN'; }).map(incomeStatementLine_);
  const expenseRows = trialBalance.rows.filter(function (row) { return row.kategori === 'BEBAN'; }).map(incomeStatementLine_);
  const revenue = sumField_(incomeRows, 'nominal');
  const expense = sumField_(expenseRows, 'nominal');
  const shu = roundCurrency_(revenue - expense);
  const assets = trialBalance.rows.filter(function (row) { return row.kategori === 'ASET'; }).map(statementLine_);
  const liabilities = trialBalance.rows.filter(function (row) { return row.kategori === 'KEWAJIBAN'; }).map(statementLine_);
  const equity = trialBalance.rows.filter(function (row) { return row.kategori === 'EKUITAS'; }).map(statementLine_);
  const benevolentBalance = roundCurrency_(trialBalance.rows.filter(function (row) {
    return row.kategori === 'DANA KEBAJIKAN';
  }).reduce(function (sum, row) {
    return sum + row.saldoAkhirKredit - row.saldoAkhirDebet;
  }, 0));
  if (benevolentBalance !== 0) liabilities.push({ kodeAkun: 'DKB', akun: 'Saldo Dana Kebajikan', grup: 'Dana Amanah', nominal: benevolentBalance });
  if (shu !== 0) equity.push({ kodeAkun: 'SHU', akun: 'SHU Tahun Berjalan', grup: 'Hasil Usaha', nominal: shu });
  const totalAssets = sumField_(assets, 'nominal');
  const totalLiabilities = sumField_(liabilities, 'nominal');
  const totalEquity = sumField_(equity, 'nominal');
  return {
    labaRugi: {
      pendapatan: incomeRows,
      beban: expenseRows,
      totalPendapatan: revenue,
      totalBeban: expense,
      shuBersih: shu
    },
    neraca: {
      aset: assets,
      kewajiban: liabilities,
      ekuitas: equity,
      totalAset: totalAssets,
      totalKewajiban: totalLiabilities,
      totalEkuitas: totalEquity,
      totalKewajibanEkuitas: roundCurrency_(totalLiabilities + totalEquity)
    }
  };
}

function statementLine_(row) {
  const sign = row.kategori === 'ASET' && row.normal === 'KREDIT' ? -1 : 1;
  return {
    kodeAkun: row.kodeAkun,
    akun: row.namaAkun,
    grup: row.grup,
    nominal: roundCurrency_(row.saldoNormal * sign)
  };
}

function incomeStatementLine_(row) {
  return {
    kodeAkun: row.kodeAkun,
    akun: row.namaAkun,
    grup: row.grup,
    nominal: roundCurrency_(row.mutasiNormal)
  };
}

function buildShuAllocation_(shu, settings) {
  const definitions = [
    ['Dana Cadangan', settings.persenCadangan],
    ['Jasa Simpanan Anggota', settings.persenJasaSimpanan],
    ['Partisipasi Anggota', settings.persenPartisipasi],
    ['Bonus Pengelola', settings.persenPengelola],
    ['Dana Sosial', settings.persenSosial]
  ];
  return {
    shu: roundCurrency_(shu),
    rows: definitions.map(function (entry) {
      return {
        pos: entry[0],
        persentase: toNumber_(entry[1]),
        jumlah: roundCurrency_(shu * toNumber_(entry[1]) / 100)
      };
    }),
    totalPersentase: definitions.reduce(function (sum, entry) { return sum + toNumber_(entry[1]); }, 0)
  };
}

function sumField_(rows, field) {
  return roundCurrency_((rows || []).reduce(function (sum, row) { return sum + toNumber_(row[field]); }, 0));
}

function mapCoaRow_(row) {
  return {
    kodeAkun: cleanString_(row['Kode Akun']),
    namaAkun: cleanString_(row['Nama Akun']),
    kategori: cleanString_(row['Kategori']),
    normal: cleanString_(row['Normal']),
    laporan: cleanString_(row['Laporan']),
    grup: cleanString_(row['Grup']),
    aktif: cleanString_(row['Aktif']).toLowerCase() !== 'tidak',
    keterangan: cleanString_(row['Keterangan'])
  };
}

function mapBankAccount_(row) {
  return {
    idRekening: row['ID Rekening'],
    namaRekening: row['Nama Rekening'],
    bank: row['Bank'],
    nomorRekening: row['Nomor Rekening'],
    kodeAkun: row['Kode Akun'],
    saldoAwal: roundCurrency_(row['Saldo Awal']),
    aktif: cleanString_(row['Aktif']).toLowerCase() !== 'tidak',
    keterangan: row['Keterangan']
  };
}

function mapFinancialTransaction_(row) {
  return {
    idTransaksi: row['ID Transaksi'],
    tanggal: row['Tanggal'],
    noBukti: row['No Bukti'],
    jenis: row['Jenis'],
    kodeRekening: row['Kode Rekening'],
    kodeLawanAkun: row['Kode Lawan Akun'],
    nominal: roundCurrency_(row['Nominal']),
    pihak: row['Pihak'],
    keterangan: row['Keterangan'],
    refId: row['Ref ID']
  };
}

function mapJournalRow_(row) {
  return {
    idJurnal: row['ID Jurnal'],
    tanggal: row['Tanggal'],
    noBukti: row['No Bukti'],
    sumber: row['Sumber'],
    refId: row['Ref ID'],
    kodeAkun: row['Kode Akun'],
    namaAkun: row['Nama Akun'],
    debet: roundCurrency_(row['Debet']),
    kredit: roundCurrency_(row['Kredit']),
    memo: row['Memo']
  };
}

function mapFixedAsset_(row) {
  return {
    idAset: row['ID Aset'],
    tanggalPerolehan: row['Tanggal Perolehan'],
    namaAset: row['Nama Aset'],
    kategori: row['Kategori'],
    kodeAkunAset: row['Kode Akun Aset'],
    nilaiPerolehan: roundCurrency_(row['Nilai Perolehan']),
    nilaiResidu: roundCurrency_(row['Nilai Residu']),
    umurBulan: toNumber_(row['Umur Bulan']),
    akumulasiPenyusutan: roundCurrency_(row['Akumulasi Penyusutan']),
    nilaiBuku: roundCurrency_(row['Nilai Buku']),
    status: row['Status'],
    keterangan: row['Keterangan']
  };
}

function mapBenevolentFund_(row) {
  return {
    idTransaksi: row['ID Transaksi'],
    tanggal: row['Tanggal'],
    jenis: row['Jenis'],
    sumberPenggunaan: row['Sumber/Penggunaan'],
    nominal: roundCurrency_(row['Nominal']),
    noBukti: row['No Bukti'],
    keterangan: row['Keterangan']
  };
}

function mapAdministration_(row) {
  return {
    idDokumen: row['ID Dokumen'],
    jenisDokumen: row['Jenis Dokumen'],
    nomor: row['Nomor'],
    tanggal: row['Tanggal'],
    berlakuSampai: row['Berlaku Sampai'],
    penanggungJawab: row['Penanggung Jawab'],
    status: row['Status'],
    linkDokumen: row['Link Dokumen'],
    keterangan: row['Keterangan']
  };
}

function writeReportSheet_(sheet, rows) {
  if (!rows.length) return;
  const width = rows.reduce(function (max, row) { return Math.max(max, row.length); }, 1);
  const normalized = rows.map(function (row) {
    const copy = row.slice();
    while (copy.length < width) copy.push('');
    return copy;
  });
  sheet.getRange(1, 1, normalized.length, width).setValues(normalized);
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, width).setFontWeight('bold').setBackground('#0f766e').setFontColor('#ffffff');
  sheet.autoResizeColumns(1, width);
  if (width > 1 && normalized.length > 1) sheet.getRange(2, 2, normalized.length - 1, width - 1).setNumberFormat('#,##0.00;[Red](#,##0.00);-');
}

function addExportSheet_(ss, name, rows) {
  const sheet = ss.insertSheet(name);
  writeReportSheet_(sheet, rows);
  return sheet;
}

function countInstallments_(idPinjaman) {
  return readObjects_(APP.sheets.angsuran).filter(function (row) {
    return row['ID Pinjaman'] === idPinjaman;
  }).length;
}

function buildExitSummary_(member) {
  return {
    idAnggota: member.idAnggota,
    nama: member.nama,
    totalSimpanan: member.totalSimpanan,
    sisaPinjaman: member.sisaPinjaman,
    nilaiAkhir: roundCurrency_(member.totalSimpanan - member.sisaPinjaman),
    label: member.totalSimpanan - member.sisaPinjaman >= 0 ? 'Dibayarkan ke anggota' : 'Ditagihkan ke anggota'
  };
}

function getReceiptData_(type, id) {
  const normalizedType = cleanString_(type).toLowerCase();
  if (normalizedType === 'simpanan') {
    const row = findObjectById_(APP.sheets.simpanan, 'ID Transaksi', id);
    if (!row) throw new Error('Transaksi simpanan tidak ditemukan.');
    return {
      title: 'Kuitansi Simpanan',
      filename: 'kuitansi-simpanan-' + row['ID Transaksi'],
      id: row['ID Transaksi'],
      tanggal: row['Tanggal'],
      nama: row['Nama'],
      idAnggota: row['ID Anggota'],
      rows: [
        ['Jenis', row['Jenis Simpanan']],
        ['Tipe', row['Tipe Transaksi']],
        ['Nominal', formatCurrencyText_(row['Nominal'])],
        ['Keterangan', row['Keterangan'] || '-']
      ],
      total: row['Nominal']
    };
  }

  if (normalizedType === 'angsuran') {
    const row = findObjectById_(APP.sheets.angsuran, 'ID Angsuran', id);
    if (!row) throw new Error('Transaksi angsuran tidak ditemukan.');
    return {
      title: 'Kuitansi Angsuran',
      filename: 'kuitansi-angsuran-' + row['ID Angsuran'],
      id: row['ID Angsuran'],
      tanggal: row['Tanggal'],
      nama: row['Nama'],
      idAnggota: row['ID Anggota'],
      rows: [
        ['ID Pinjaman', row['ID Pinjaman']],
        ['Angsuran Ke', row['Angsuran Ke']],
        ['Nominal Pokok+Bunga', formatCurrencyText_(row['Nominal Pokok+Bunga'])],
        ['Denda', formatCurrencyText_(row['Denda'])],
        ['Sisa Setelah Bayar', formatCurrencyText_(row['Sisa Setelah Bayar'])],
        ['Keterangan', row['Keterangan'] || '-']
      ],
      total: row['Total Bayar']
    };
  }

  if (normalizedType === 'pinjaman') {
    const row = findObjectById_(APP.sheets.pinjaman, 'ID Pinjaman', id);
    if (!row) throw new Error('Pinjaman tidak ditemukan.');
    return {
      title: 'Bukti Pencairan Pinjaman',
      filename: 'bukti-pinjaman-' + row['ID Pinjaman'],
      id: row['ID Pinjaman'],
      tanggal: row['Tanggal'],
      nama: row['Nama'],
      idAnggota: row['ID Anggota'],
      rows: [
        ['Pokok Pinjaman', formatCurrencyText_(row['Pokok'])],
        ['Bunga per Bulan', row['Bunga %'] + '%'],
        ['Tenor', row['Tenor'] + ' bulan'],
        ['Biaya Admin', formatCurrencyText_(row['Biaya Admin'])],
        ['Total Bunga', formatCurrencyText_(row['Total Bunga'])],
        ['Total Tagihan', formatCurrencyText_(row['Total Tagihan'])],
        ['Angsuran Bulanan', formatCurrencyText_(row['Angsuran Bulanan'])]
      ],
      total: row['Pokok']
    };
  }

  throw new Error('Jenis kuitansi tidak valid.');
}

function buildReceiptHtml_(settings, receipt) {
  const logo = settings.logoUrl
    ? '<img src="' + escapeHtml_(settings.logoUrl) + '" style="width:64px;height:64px;object-fit:contain;margin-right:16px;">'
    : '<div style="width:64px;height:64px;border:1px solid #d7dde2;display:flex;align-items:center;justify-content:center;margin-right:16px;font-weight:700;color:#0f766e;">KSP</div>';
  const rows = receipt.rows.map(function (row) {
    return '<tr><td>' + escapeHtml_(row[0]) + '</td><td>' + escapeHtml_(row[1]) + '</td></tr>';
  }).join('');

  return '<!doctype html><html><head><meta charset="utf-8">'
    + '<style>'
    + 'body{font-family:Arial,sans-serif;color:#1f2933;padding:28px;}'
    + '.head{display:flex;align-items:center;border-bottom:2px solid #0f766e;padding-bottom:16px;margin-bottom:20px;}'
    + 'h1{font-size:20px;margin:0 0 4px;} h2{font-size:18px;margin:0 0 16px;}'
    + 'p{margin:3px 0;color:#526171;} table{width:100%;border-collapse:collapse;margin-top:12px;}'
    + 'td{border-bottom:1px solid #e5e7eb;padding:10px 0;font-size:13px;} td:first-child{color:#526171;width:38%;}'
    + '.total{margin-top:18px;padding:14px;background:#f1f8f6;border:1px solid #b7ddd3;font-size:18px;font-weight:700;}'
    + '.sign{display:flex;justify-content:space-between;margin-top:60px;font-size:12px;color:#526171;}'
    + '</style></head><body>'
    + '<div class="head">' + logo + '<div><h1>' + escapeHtml_(settings.namaKoperasi || 'Koperasi Simpan Pinjam') + '</h1>'
    + '<p>' + escapeHtml_(settings.alamatKoperasi || '') + '</p></div></div>'
    + '<h2>' + escapeHtml_(receipt.title) + '</h2>'
    + '<p>No: <strong>' + escapeHtml_(receipt.id) + '</strong></p>'
    + '<p>Tanggal: <strong>' + escapeHtml_(receipt.tanggal) + '</strong></p>'
    + '<p>Anggota: <strong>' + escapeHtml_(receipt.nama) + ' (' + escapeHtml_(receipt.idAnggota) + ')</strong></p>'
    + '<table>' + rows + '</table>'
    + '<div class="total">Total: ' + formatCurrencyText_(receipt.total) + '</div>'
    + '<div class="sign"><div>Anggota,<br><br><br>(' + escapeHtml_(receipt.nama) + ')</div><div>Petugas,<br><br><br>(________________)</div></div>'
    + '</body></html>';
}

function getSpreadsheet_() {
  if (SPREADSHEET_ID) return SpreadsheetApp.openById(SPREADSHEET_ID);
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    throw new Error('Spreadsheet tidak ditemukan. Buat Apps Script dari Google Sheet atau isi SPREADSHEET_ID.');
  }
  return ss;
}

function setupDatabaseLite_() {
  const ss = getSpreadsheet_();
  ensureSheet_(ss, APP.sheets.pengaturan, APP.headers.Pengaturan);
  ensureDefaultSettings_();
}

function ensureSheet_(ss, sheetName, headers) {
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) sheet = ss.insertSheet(sheetName);

  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  } else {
    const lastCol = Math.max(sheet.getLastColumn(), headers.length);
    const current = sheet.getRange(1, 1, 1, lastCol).getValues()[0].filter(function (header) {
      return header !== '';
    });
    if (current.length === 0) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    } else {
      const missing = headers.filter(function (header) {
        return current.indexOf(header) === -1;
      });
      if (missing.length > 0) {
        sheet.getRange(1, current.length + 1, 1, missing.length).setValues([missing]);
      }
    }
  }

  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, sheet.getLastColumn())
    .setFontWeight('bold')
    .setBackground('#e8f4f1');
  sheet.autoResizeColumns(1, sheet.getLastColumn());
}

function ensureDefaultSettings_() {
  const rows = readObjects_(APP.sheets.pengaturan);
  const existingKeys = rows.map(function (row) {
    return row.Key;
  });
  const sheet = getSheet_(APP.sheets.pengaturan);
  APP.defaults.forEach(function (entry) {
    if (existingKeys.indexOf(entry[0]) === -1) {
      sheet.appendRow(entry);
    }
  });
}

function ensureDefaultCoa_() {
  const existing = {};
  readObjects_(APP.sheets.coa).forEach(function (row) {
    existing[cleanString_(row['Kode Akun'])] = true;
  });
  const sheet = getSheet_(APP.sheets.coa);
  DEFAULT_COA.forEach(function (row) {
    if (!existing[row[0]]) sheet.appendRow(row);
  });
}

function ensureDefaultBankAccount_() {
  if (readObjects_(APP.sheets.rekening).length) return;
  appendObject_(APP.sheets.rekening, {
    'ID Rekening': 'REK-UTAMA',
    'Nama Rekening': 'Bank Operasional',
    'Bank': '',
    'Nomor Rekening': '',
    'Kode Akun': '1112',
    'Saldo Awal': 0,
    'Aktif': 'Ya',
    'Keterangan': 'Rekening default. Lengkapi melalui menu Akuntansi.'
  });
}

function getSheet_(sheetName) {
  const sheet = getSpreadsheet_().getSheetByName(sheetName);
  if (!sheet) throw new Error('Sheet ' + sheetName + ' belum tersedia. Jalankan setupDatabase().');
  return sheet;
}

function getHeaders_(sheetName) {
  const sheet = getSheet_(sheetName);
  return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
}

function readObjects_(sheetName) {
  const sheet = getSheet_(sheetName);
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow < 2 || lastCol < 1) return [];

  const values = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  const headers = values[0];
  return values.slice(1)
    .map(function (row, index) {
      const obj = { _row: index + 2 };
      headers.forEach(function (header, colIndex) {
        if (!header) return;
        obj[header] = normalizeValue_(row[colIndex]);
      });
      return obj;
    })
    .filter(function (row) {
      return Object.keys(row).some(function (key) {
        return key !== '_row' && row[key] !== '';
      });
    });
}

function appendObject_(sheetName, obj) {
  const sheet = getSheet_(sheetName);
  const headers = getHeaders_(sheetName);
  const row = headers.map(function (header) {
    return obj[header] !== undefined ? obj[header] : '';
  });
  sheet.appendRow(row);
  return obj;
}

function updateObject_(sheetName, rowNumber, patch) {
  const sheet = getSheet_(sheetName);
  const headers = getHeaders_(sheetName);
  const current = sheet.getRange(rowNumber, 1, 1, headers.length).getValues()[0];
  const next = headers.map(function (header, index) {
    return patch[header] !== undefined ? patch[header] : current[index];
  });
  sheet.getRange(rowNumber, 1, 1, headers.length).setValues([next]);
}

function findObjectById_(sheetName, idHeader, id) {
  return readObjects_(sheetName).filter(function (row) {
    return String(row[idHeader]) === String(id);
  })[0] || null;
}

function withLock_(callback) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    return callback();
  } finally {
    lock.releaseLock();
  }
}

function normalizeValue_(value) {
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value)) {
    return formatDate_(value);
  }
  if (value === null || value === undefined) return '';
  return value;
}

function normalizePeriod_(period) {
  const today = new Date();
  const input = period || {};
  return {
    mode: input.mode || 'last6',
    year: parseInt(input.year, 10) || today.getFullYear(),
    month: parseInt(input.month, 10) || today.getMonth() + 1,
    startDate: input.startDate || '',
    endDate: input.endDate || ''
  };
}

function getPeriodRange_(period) {
  const today = new Date();
  if (period.mode === 'all') {
    return { start: null, end: null };
  }
  if (period.mode === 'year') {
    return {
      start: new Date(period.year, 0, 1),
      end: endOfDay_(new Date(period.year, 11, 31))
    };
  }
  if (period.mode === 'month') {
    return {
      start: new Date(period.year, period.month - 1, 1),
      end: endOfDay_(new Date(period.year, period.month, 0))
    };
  }
  if (period.mode === 'custom') {
    return {
      start: parseDate_(period.startDate),
      end: endOfDay_(parseDate_(period.endDate) || today)
    };
  }

  return {
    start: new Date(today.getFullYear(), today.getMonth() - 5, 1),
    end: endOfDay_(today)
  };
}

function isInRange_(dateValue, range) {
  const date = parseDate_(dateValue);
  if (!date) return false;
  if (range.start && date < startOfDay_(range.start)) return false;
  if (range.end && date > endOfDay_(range.end)) return false;
  return true;
}

function periodLabel_(period, range) {
  if (period.mode === 'all') return 'Semua periode';
  if (period.mode === 'year') return 'Tahun ' + period.year;
  if (period.mode === 'month') return APP.months[period.month - 1] + ' ' + period.year;
  if (period.mode === 'custom') {
    return (range.start ? formatDate_(range.start) : '-') + ' s/d ' + (range.end ? formatDate_(range.end) : '-');
  }
  return '6 bulan terakhir';
}

function parseDate_(value) {
  if (!value) return null;
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value)) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }
  const text = String(value);
  const parts = text.split('-');
  if (parts.length >= 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    if (!isNaN(year) && !isNaN(month) && !isNaN(day)) return new Date(year, month, day);
  }
  const parsed = new Date(text);
  return isNaN(parsed) ? null : new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

function startOfDay_(date) {
  if (!date) return null;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

function endOfDay_(date) {
  if (!date) return null;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function formatDate_(date) {
  return Utilities.formatDate(date, APP.tz, 'yyyy-MM-dd');
}

function today_() {
  return formatDate_(new Date());
}

function timestamp_() {
  return Utilities.formatDate(new Date(), APP.tz, 'yyyy-MM-dd HH:mm:ss');
}

function generateId_(prefix) {
  const stamp = Utilities.formatDate(new Date(), APP.tz, 'yyMMddHHmmss');
  const random = Math.floor(Math.random() * 9000) + 1000;
  return prefix + '-' + stamp + '-' + random;
}

function monthKey_(date) {
  if (!date) return '';
  return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0');
}

function monthLabel_(key) {
  const parts = key.split('-');
  const year = parts[0];
  const month = parseInt(parts[1], 10);
  return APP.months[month - 1] + ' ' + year;
}

function sortByDateDesc_(a, b) {
  const ad = parseDate_(a.tanggal);
  const bd = parseDate_(b.tanggal);
  return (bd ? bd.getTime() : 0) - (ad ? ad.getTime() : 0)
    || String(b.dibuatPada || '').localeCompare(String(a.dibuatPada || ''));
}

function sortRawByDateAsc_(a, b) {
  const ad = parseDate_(a['Tanggal']);
  const bd = parseDate_(b['Tanggal']);
  return (ad ? ad.getTime() : 0) - (bd ? bd.getTime() : 0)
    || String(a['Dibuat Pada'] || '').localeCompare(String(b['Dibuat Pada'] || ''));
}

function cleanString_(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function toNumber_(value) {
  if (typeof value === 'number') return isNaN(value) ? 0 : value;
  if (value === null || value === undefined || value === '') return 0;
  let text = String(value).trim();
  text = text.replace(/Rp/gi, '').replace(/\s/g, '');
  if (text.indexOf(',') > -1) {
    text = text.replace(/\./g, '').replace(',', '.');
  } else {
    text = text.replace(/,/g, '');
  }
  const parsed = Number(text);
  return isNaN(parsed) ? 0 : parsed;
}

function roundCurrency_(value) {
  return Math.round(toNumber_(value));
}

function formatCurrencyText_(value) {
  const number = roundCurrency_(value);
  return 'Rp ' + String(number).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function escapeHtml_(value) {
  return String(value === null || value === undefined ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
