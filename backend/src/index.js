const { connect } = require('../config/sqlserver');

async function testConnection() {
  try {
    console.log('Testing SQL Server connection...');
    const db = await connect();

    // const query = `
    //   select distinct cast(a.product_id+''+a.Batch_No +''+a.Batch_Date as varchar(255)) as ID, a.nama_tahapan, cast('Pending' as varchar(255)) as Status,a.kode_tahapan, a.Urutan
    //         , a.dept
    //         into #tmp
    //         from 
    //           t_alur_proses a left hash join 
    //           t_alur_proses b on isnull(a.Prev_Step,'') = b.nama_tahapan and a.Batch_No =b.Batch_No and a.Batch_Date=b.Batch_Date and a.Product_ID=b.Product_ID
    //         left hash join m_product prod on a.Product_ID=prod.Product_ID
    //         left hash join t_alur_proses_batch_status sts on a.Product_ID =sts.product_id and a.Batch_Date=sts.batch_date and a.Batch_No = sts.Batch_No
    //         where a.StartDate is null and a.EndDate is null and
    //           b.StatusPending is not null and b.nama_tahapan is not null

    //         insert into #tmp
    //         select  a.product_id+''+a.Batch_No +''+a.Batch_Date as ID, nama_tahapan, 'On Progress' as Status,kode_tahapan, Urutan, dept
    //         from t_alur_proses a
    //         left hash join m_product prod on a.Product_ID=prod.Product_ID
    //         left hash join t_alur_proses_batch_status sts on a.Product_ID =sts.product_id and a.Batch_Date=sts.batch_date and a.Batch_No = sts.Batch_No
    //         where ISNULL(StartDate,'')<>'' 
    //           and ISNULL(EndDate,'')=''

    //         insert into #tmp
    //         select a.product_id+''+a.Batch_No +''+a.Batch_Date as ID, a.nama_tahapan, 'Idle' as Status,a.kode_tahapan, a.Urutan, a.dept
    //         from t_alur_proses a 
    //         left hash join m_product prod on a.Product_ID=prod.Product_ID
    //         left hash join #tmp b on a.product_id+''+a.Batch_No +''+a.Batch_Date+'_'+cast(a.kode_tahapan as varchar(255))=
    //         b.ID+'_'+cast(b.kode_tahapan as varchar(255))
    //         left hash join t_alur_proses_batch_status sts on a.Product_ID =sts.product_id and a.Batch_Date=sts.batch_date and a.Batch_No = sts.Batch_No
    //         where (a.Display =1 and ISNULL(a.StartDate,'')='' and ISNULL(a.EndDate,'')='')
    //         and b.ID+'_'+cast(b.kode_tahapan as varchar(255)) is null

    //         declare @tmpNamaTahapan as TmpTableXML 
    //         insert into @tmpNamaTahapan
    //         select ID, Status +'#'+'('+dept+') '+nama_tahapan as nama_tahapan from #tmp order by Urutan

    //         select f.Product_Name, b.Batch_No, convert(varchar(10),d.EndDate,120) +' '+convert(varchar(5),d.EndDate,108) [Tgl Timbang],
    //         DATEDIFF(day, d.EndDate, GETDATE()) [Hari WIP],
    //         dbo.TblToRow(@tmpNamaTahapan, b.product_id+''+b.Batch_No +''+b.Batch_Date, ';') [Tahapan Berjalan], 
    //         convert(varchar(10),i.Process_Date,120)+' '+convert(varchar(5),i.Process_Date,108) [Close BPHP],
    //         convert(varchar(10),GETDATE(),120)+' '+convert(varchar(5),GETDATE(),108) [Tanggal Penarikan]
    //         from t_alur_proses b 
    //         join ((select distinct Batch_No, Batch_Date, Product_ID from t_rfid_batch_card where Batch_Status='Open' and isActive=1
    //             and Batch_No<>'')) c  on c.Batch_No=b.Batch_No and b.Batch_Date=c.Batch_Date and b.Product_ID=c.Product_ID
    //         join (select distinct Batch_No, Batch_Date, Product_ID, EndDate from t_alur_proses where nama_tahapan like 'Timbang BB'
    //             and EndDate is not null) d on d.Batch_Date=b.Batch_Date and d.Batch_No=b.Batch_No and d.Product_ID=b.Product_ID
    //         join m_product f on f.Product_ID=b.Product_ID 
    //         left join (select DNc_BatchNo, DNc_ProductID from t_dnc_product where isnull(DNC_TempelLabel,'')<>'') g 
    //         on g.DNc_ProductID=b.Product_ID and g.DNc_BatchNo=b.Batch_No 
    //         left join (select BatchNo, ProductID, Process_Date from t_bphprekap_status where Approver_No=2 and year(Process_Date)>=2023) i
    //         on i.BatchNo=b.Batch_No and i.ProductID=b.Product_ID
    //         where nama_tahapan like '%tempel label%' and b.EndDate is null
    //         and (Product_Name  not like '%Granulat%' and g.DNc_BatchNo is null) 
    //         and not (b.Batch_No ='CY3A01' or b.Batch_No ='BI063' or b.Batch_No ='PI3L01')

    //   DROP TABLE #tmp
    // `;

    const query = `SELECT TOP 1 * FROM INFORMATION_SCHEMA.TABLES`;

    const result = await db.request().query(query);
    console.log('Query result:', result.recordset);
    process.exit(0);
  } catch (err){
    console.error('Connection or query failed:', err);
    process.exit(1);
  }
}

testConnection();