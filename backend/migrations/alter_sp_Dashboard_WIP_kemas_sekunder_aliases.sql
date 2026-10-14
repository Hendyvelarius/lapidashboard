-- =============================================
-- sp_Dashboard_WIP -- Kemas status matches the renamed Persiapan Kemas Sekunder
--
-- Changes against alter_sp_Dashboard_WIP_step_aliases.sql (the definition
-- that was live before; run that file to roll back):
--
-- 1. The 'Kemas' join (RAW mode: Status 'Kemas' and its StatusDuration)
--    matched 'Persiapan Kemas Sekunder' by name. On CAL-95's new route its
--    successor is step 348, 'Change Over Kemas Sekunder', which PIC plans to
--    shorten to 'Change Over KS'. t_alur_proses copies the name when a route
--    is created. The join now matches all three names (PERSIAPAN_KS in
--    backend/src/utils/routeSteps.js); by name only, like the other joins here,
--    because code 68 also carries numbered rows ('Persiapan Kemas Sekunder 59').
--    No existing batch carries the new names, so results are unchanged.
-- =============================================
ALTER procedure [dbo].[sp_Dashboard_WIP] (@ReportType as varchar(255))
as
--exec sp_Dashboard_WIP ''
--select * from t_alur_proses where Batch_No='FG035' order by urutan

		select * into #tmpData from vw_wip_produksi
		
		--select distinct cast(a.product_id+'_'+a.Batch_No +'_'+a.Batch_Date as varchar(255)) as ID, a.nama_tahapan, cast('Pending' as varchar(255)) as Status,
		--a.kode_tahapan, a.Urutan
  --      , a.dept
  --      into #tmp
  --      from 
  --        t_alur_proses a left hash join 
  --        t_alur_proses b on isnull(a.Prev_Step,'') = b.nama_tahapan and a.Batch_No =b.Batch_No and a.Batch_Date=b.Batch_Date and a.Product_ID=b.Product_ID
  --      left hash join m_product prod on a.Product_ID=prod.Product_ID
  --      left hash join t_alur_proses_batch_status sts on a.Product_ID =sts.product_id and a.Batch_Date=sts.batch_date and a.Batch_No = sts.Batch_No
  --      where a.StartDate is null and a.EndDate is null and
  --        b.StatusPending is not null and b.nama_tahapan is not null

  --      insert into #tmp
  --      select  a.product_id+'_'+a.Batch_No +'_'+a.Batch_Date as ID, nama_tahapan, 'On Progress' as Status,kode_tahapan, Urutan, dept
  --      from t_alur_proses a
  --      left hash join m_product prod on a.Product_ID=prod.Product_ID
  --      left hash join t_alur_proses_batch_status sts on a.Product_ID =sts.product_id and a.Batch_Date=sts.batch_date and a.Batch_No = sts.Batch_No
  --      where ISNULL(StartDate,'')<>'' 
  --        and ISNULL(EndDate,'')=''

  --      insert into #tmp
  --      select a.product_id+'_'+a.Batch_No +'_'+a.Batch_Date as ID, a.nama_tahapan, 'Idle' as Status,a.kode_tahapan, a.Urutan, a.dept
  --      from t_alur_proses a 
  --      left hash join m_product prod on a.Product_ID=prod.Product_ID
  --      left hash join #tmp b on a.product_id+'_'+a.Batch_No +'_'+a.Batch_Date+'_'+cast(a.kode_tahapan as varchar(255))=
  --      b.ID+'_'+cast(b.kode_tahapan as varchar(255))
  --      left hash join t_alur_proses_batch_status sts on a.Product_ID =sts.product_id and a.Batch_Date=sts.batch_date and a.Batch_No = sts.Batch_No
  --      where (a.Display =1 and ISNULL(a.StartDate,'')='' and ISNULL(a.EndDate,'')='')
  --      and b.ID+'_'+cast(b.kode_tahapan as varchar(255)) is null

  --      declare @tmpNamaTahapan as TmpTableXML 
  --      insert into @tmpNamaTahapan
  --      select ID, Status +'#'+'('+dept+') '+nama_tahapan as nama_tahapan from #tmp order by Urutan

  --      select distinct f.Product_ID, f.Product_Name, b.Batch_No, 
  --      isnull(convert(varchar(10),d.EndDate,120) +' '+convert(varchar(5),d.EndDate,108),convert(varchar(10),mulaiProd.EndDate,120) +' '+convert(varchar(5),mulaiProd.EndDate,108)) [Tgl Timbang],
  --      isnull(DATEDIFF(day, d.EndDate, GETDATE()),DATEDIFF(day, mulaiProd.EndDate, GETDATE())) [Hari WIP],
  --      dbo.TblToRow(@tmpNamaTahapan, b.product_id+'_'+b.Batch_No +'_'+b.Batch_Date, ';') [Tahapan Berjalan], 
  --      convert(varchar(10),i.Process_Date,120)+' '+convert(varchar(5),i.Process_Date,108) [Close BPHP],
  --      convert(varchar(10),GETDATE(),120)+' '+convert(varchar(5),GETDATE(),108) [Tanggal Penarikan],
  --      alur.Jenis_Sediaan AS [Pengelompokan], -- pcl.leadTime,
  --      --png.Group_Dept [Dept]
  --      alur.Dept [Dept]
  --      --,  Group_PNCategoryName
        
  --      into #tmpData
  --      from t_alur_proses b 
  --      join ((select distinct Batch_No, Batch_Date, Product_ID from t_rfid_batch_card where Batch_Status='Open' and isActive=1
  --          and Batch_No<>'')) c  on c.Batch_No=b.Batch_No and b.Batch_Date=c.Batch_Date and b.Product_ID=c.Product_ID
  --      left join (
		--	select distinct Batch_No, Batch_Date, Product_ID, max(EndDate) EndDate from t_alur_proses where ltrim(rtrim(nama_tahapan)) like 'Timbang BB'
  --          and EndDate is not null group by Batch_No, Batch_Date, Product_ID
  --          ) d on d.Batch_Date=b.Batch_Date and d.Batch_No=b.Batch_No and d.Product_ID=b.Product_ID
  --      left join (
		--	select distinct Batch_No, Batch_Date, Product_ID, EndDate from t_alur_proses where ltrim(rtrim(nama_tahapan)) like 'Terima Bahan Baku'
  --          and EndDate is not null
  --          ) mulaiProd on mulaiProd.Batch_Date=b.Batch_Date and mulaiProd.Batch_No=b.Batch_No and mulaiProd.Product_ID=b.Product_ID    
  --      join m_product f on f.Product_ID=b.Product_ID 
  --      left join (select DNc_BatchNo, DNc_ProductID from t_dnc_product where isnull(DNC_TempelLabel,'')<>'') g 
  --      on g.DNc_ProductID=b.Product_ID and g.DNc_BatchNo=b.Batch_No 
  --      left join (select BatchNo, ProductID, Process_Date from t_bphprekap_status where Approver_No=2 and year(Process_Date)>=2023) i
  --      on i.BatchNo=b.Batch_No and i.ProductID=b.Product_ID
  --      --left join m_product_pc_group_detail pcd on pcd.Product_id = f.Product_ID
  --      --left join m_product_pc_group_header pch on pch.ID_master=pcd.ID_master
  --      --left join m_product_pc_group_LeadTime pcl on pcl.ID_master=pch.ID_master
  --      --left join m_product_pn_group_dept pngd on pngd.group_productid=f.Product_ID
  --      left join m_alur_jenis_sediaan_produk alur on alur.Product_ID = b.Product_ID
  --      --left join m_product_pn_group png on png.Group_ProductID = f.product_id and replace(png.Group_Periode,' ','') = CONVERT(varchar(6),getdate(),112)
		--left join t_wip_batal wipbatal on wipbatal.wip_batchno=b.Batch_No and wipbatal.batchDate=b.Batch_Date and wipbatal.wip_productID=b.Product_ID
  --      where nama_tahapan like '%tempel label%' and b.EndDate is null
  --      and (Product_Name  not like '%Granulat%' and g.DNc_BatchNo is null) 
  --      and not (b.Batch_No ='CY3A01' or b.Batch_No ='BI063' or b.Batch_No ='PI3L01')
  --      and (d.Batch_No is not null or mulaiProd.Batch_No is not null)
  --      and (wipbatal.wip_batchno is null)
        
--select * from @tmpNamaTahapan
		select distinct Product_ID, STUFF((SELECT ',' + Batch_No FROM #tmpData where Product_ID=a.Product_Id FOR XML PATH ('')), 1, 1, '') as [BatchNo_List] into #tmpDataB from #tmpData a 
		
		if(@ReportType='' or @ReportType='Raw')
		begin
			select distinct a.*,c.Product_SalesHNA, bbb.BatchSizeTeoritis StdOutput, iii.produksi BPHP,
			case 
				when dnc.DNC_TempelLabel is not null then 'Release' 
				when Karantina.EndDate is not null then 'Karantina' 
				when Kemas.EndDate is not null then 'Kemas' 
				when proses.EndDate is not null then 'Proses'
				else 'Proses' 
			end [Status],
			case 
				when dnc.DNC_TempelLabel is not null then datediff(day, dnc.DNC_TempelLabel, getdate()) 
				when Karantina.EndDate is not null then datediff(day,Karantina.EndDate , getdate())
				when Kemas.EndDate is not null then datediff(day, Kemas.EndDate, getdate())
				when proses.EndDate is not null then datediff(day, proses.EndDate, getdate())
				else '0' 
			end [StatusDuration]
			
			from #tmpData a left join m_product c on c.Product_ID=a.Product_ID 
				left join(select group_productid, group_productinit              
						 , round((isnull(group_manhourpros,0)+isnull(group_manhourpack,0)) /case isnull(group_STDOutput,0) when 0 then 1 else group_stdoutput end, 3) as JamPerUnit               
						 , case isnull(group_STDOutput,0) when 0 then 1 else group_stdoutput end as BatchSizeTeoritis              
						 from m_product_pn_group               
						 where replace(group_periode,' ','') = convert(varchar(6),GETDATE(),112)
						 ) bbb on bbb.group_productid = a.Product_ID               
				left join( select a.bphp_productid, a.bphp_productinit, a.BPHP_BatchNo, sum(a.bphp_jumlah) as produksi from t_bphp_detail a              
					 inner join t_bphp_header b on a.bphp_no = b.bphp_no              
					 --where a.bphp_no in (select bphp_no from t_bphp_status where Approver_No = '3' and isReject = 0 and convert(nvarchar(6),process_date,112) = convert(varchar(6),GETDATE(),112))              
					 group by a.bphp_productid, a.bphp_productinit, a.BPHP_BatchNo) iii on iii.BPHP_ProductID=a.Product_ID and iii.BPHP_BatchNo = a.Batch_No
				--select * from t_alur_proses where Batch_No='FG035'	 order by urutan
				left join (select a.Product_ID, a.Batch_No, urutan, nama_tahapan, StartDate, EndDate from t_alur_proses a join #tmpData b on a.Product_ID=b.Product_ID and a.Batch_No=b.Batch_No where ltrim(rtrim(nama_tahapan)) in ('Approve Terima Bahan Baku', 'Approve Terima BB') ) as proses on a.Batch_No=proses.Batch_No and a.Product_ID=proses.Product_ID --and EndDate is not null
				left join (select a.Product_ID, a.Batch_No, urutan, nama_tahapan, StartDate, EndDate from t_alur_proses a join #tmpData b on a.Product_ID=b.Product_ID and a.Batch_No=b.Batch_No where ltrim(rtrim(nama_tahapan)) in ('Persiapan Kemas Sekunder', 'Change Over Kemas Sekunder', 'Change Over KS') ) as Kemas on a.Batch_No=kemas.Batch_No and a.Product_ID=kemas.Product_ID --and EndDate is not null
				left join (select a.Product_ID, a.Batch_No, urutan, nama_tahapan, StartDate, EndDate from t_alur_proses a join #tmpData b on a.Product_ID=b.Product_ID and a.Batch_No=b.Batch_No where ltrim(rtrim(nama_tahapan))='Pengiriman Obat Jadi' ) as Karantina on a.Batch_No=Karantina.Batch_No and a.Product_ID=Karantina.Product_ID --and EndDate is not null
				left join (select DNc_ProductID, DNc_BatchNo, DNC_TempelLabel from t_dnc_product where isnull(DNC_TempelLabel,'')<>'' and YEAR(DNC_TempelLabel)=year(GETDATE())) dnc on dnc.DNc_ProductID=a.Product_ID and dnc.DNc_BatchNo=a.Batch_No
					 
				order by Product_Name
		end
		
		if(@ReportType='SummaryTotal')
		begin
			select * from 
				(select COUNT(*) totalWIP  from #tmpData) a,
				(select COUNT(*) TotalBelumCloseBPHP from #tmpData where [Close BPHP] is null) b,
				(select COUNT(*) TotalCloseBPHP from #tmpData where [Close BPHP] is not null) c
		end
		
		if(@ReportType='WIPProd')
		begin
			select a.Product_ID, Product_Name, COUNT(batch_no) Jlh_Batch, b.BatchNo_List from #tmpData a join #tmpDataB b on a.Product_ID = b.Product_ID
			group by a.Product_ID, Product_Name,BatchNo_List
		end
		
		if(@ReportType='WIPProdByDept')
		begin
			select Dept, COUNT(*) Total from #tmpData group by Dept
		end
		
		if(@ReportType='WIPProdByPCGroup')
		begin
			select pengelompokan, COUNT(*) Total from #tmpData group by pengelompokan
		end
		
		

        --DROP TABLE #tmp
        drop table #tmpData
        
        drop table #tmpDataB