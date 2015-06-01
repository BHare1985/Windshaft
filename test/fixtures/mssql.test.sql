USE [windshaft_test]
GO

DROP TABLE [dbo].[test_table]
GO

DROP TABLE [dbo].[test_table_2]
GO

DROP TABLE [dbo].[test_table_3]
GO

SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[test_table](
	[updated_at] [datetime] NULL,
	[created_at] [datetime] NULL,
	[cartodb_id] [int] NOT NULL,
	[name] [nvarchar](max) NULL,
	[address] [nvarchar](max) NULL,
	[the_geom] [geometry] NULL,
	[the_geom_webmercator] [geometry] NULL,
 CONSTRAINT [test_table_pkey] PRIMARY KEY CLUSTERED 
(
	[cartodb_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]

GO

 --   CONSTRAINT enforce_dims_the_geom CHECK ((st_ndims(the_geom) = 2)),
 --   CONSTRAINT enforce_dims_the_geom_webmercator CHECK ((st_ndims(the_geom_webmercator) = 2)),
 --   CONSTRAINT enforce_geotype_the_geom CHECK (((geometrytype(the_geom) = 'POINT'::text) OR (the_geom IS NULL))),
 --   CONSTRAINT enforce_geotype_the_geom_webmercator CHECK (((geometrytype(the_geom_webmercator) = 'POINT'::text) OR (the_geom_webmercator IS NULL))),
 --   CONSTRAINT enforce_srid_the_geom CHECK ((st_srid(the_geom) = 4326)),
 --   CONSTRAINT enforce_srid_the_geom_webmercator CHECK ((st_srid(the_geom_webmercator) = 3857))

CREATE SPATIAL INDEX test_table_the_geom_idx ON test_table(the_geom)
USING  GEOMETRY_AUTO_GRID  
WITH (BOUNDING_BOX =(-180, -90, 180, 90), 
CELLS_PER_OBJECT = 16, PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
GO

CREATE SPATIAL INDEX test_table_the_geom_webmercator_idx ON test_table(the_geom_webmercator)
USING  GEOMETRY_AUTO_GRID  
WITH (BOUNDING_BOX =(-20037508.34,-20037508.34,20037508.34,20037508.34), 
CELLS_PER_OBJECT = 16, PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
GO


INSERT INTO test_table VALUES ('2011-09-21 14:02:21', '2011-09-21 14:02:21', 1, 'Hawai', 'Calle de Pérez Galdós 9, Madrid, Spain', geometry::STGeomFromText('POINT(-3.699732 40.423012)', 4326), geometry::STGeomFromText('POINT(-411852.28231158 4927604.99065116)', 3857))
GO
INSERT INTO test_table VALUES ('2011-09-21 14:02:21', '2011-09-21 14:02:21', 2, 'El Estocolmo', 'Calle de la Palma 72, Madrid, Spain', geometry::STGeomFromText('POINT(-3.708969 40.426949)', 4326), geometry::STGeomFromText('POINT(-412880.540448036 4928180.70372423)', 3857))
GO
INSERT INTO test_table VALUES ('2011-09-21 14:02:21', '2011-09-21 14:02:21', 3, 'El Rey del Tallarín', 'Plaza Conde de Toreno 2, Madrid, Spain', geometry::STGeomFromText('POINT(-3.70957 40.424654)', 4326), geometry::STGeomFromText('POINT(-412947.443462004 4927845.09853507)', 3857))
GO
INSERT INTO test_table VALUES ('2011-09-21 14:02:21', '2011-09-21 14:02:21', 4, 'El Lacón', 'Manuel Fernández y González 8, Madrid, Spain',geometry::STGeomFromText('POINT(-3.699871 40.415113)', 4326), geometry::STGeomFromText('POINT(-411867.7557208 4926450.01033066)', 3857))
GO
INSERT INTO test_table VALUES ('2011-09-21 14:02:21', '2011-09-21 14:02:21', 5, 'El Pico', 'Calle Divino Pastor 12, Madrid, Spain', geometry::STGeomFromText('POINT(-3.703991 40.428198)', 4326), geometry::STGeomFromText('POINT(-412326.392022869 4928363.35380041)', 3857));
GO




CREATE TABLE [dbo].[test_table_2](
	[updated_at] [datetime] NULL,
	[created_at] [datetime] NULL,
	[cartodb_id] [int] NOT NULL,
	[name] [nvarchar](max) NULL,
	[address] [nvarchar](max) NULL,
	[the_geom] [geometry] NULL,
	[the_geom_webmercator] [geometry] NULL,
 CONSTRAINT [test_table_2_pkey] PRIMARY KEY CLUSTERED 
(
	[cartodb_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]

GO

 --   CONSTRAINT enforce_dims_the_geom CHECK ((st_ndims(the_geom) = 2)),
 --   CONSTRAINT enforce_dims_the_geom_webmercator CHECK ((st_ndims(the_geom_webmercator) = 2)),
 --   CONSTRAINT enforce_geotype_the_geom CHECK (((geometrytype(the_geom) = 'POINT'::text) OR (the_geom IS NULL))),
 --   CONSTRAINT enforce_geotype_the_geom_webmercator CHECK (((geometrytype(the_geom_webmercator) = 'POINT'::text) OR (the_geom_webmercator IS NULL))),
 --   CONSTRAINT enforce_srid_the_geom CHECK ((st_srid(the_geom) = 4326)),
 --   CONSTRAINT enforce_srid_the_geom_webmercator CHECK ((st_srid(the_geom_webmercator) = 3857))

CREATE SPATIAL INDEX test_table_2_the_geom_idx ON test_table_2(the_geom)
USING  GEOMETRY_AUTO_GRID  
WITH (BOUNDING_BOX =(-180, -90, 180, 90), 
CELLS_PER_OBJECT = 16, PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
GO

CREATE SPATIAL INDEX test_table_2_the_geom_webmercator_idx ON test_table_2(the_geom_webmercator)
USING  GEOMETRY_AUTO_GRID  
WITH (BOUNDING_BOX =(-20037508.34,-20037508.34,20037508.34,20037508.34), 
CELLS_PER_OBJECT = 16, PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
GO


INSERT INTO test_table_2 VALUES ('2011-09-21 14:02:21', '2011-09-21 14:02:21', 1, 'Hawai', 'Calle de Pérez Galdós 9, Madrid, Spain', geometry::STGeomFromText('POINT(-3.699732 40.423012)', 4326), geometry::STGeomFromText('POINT(-411852.28231158 4927604.99065116)', 3857))
GO
INSERT INTO test_table_2 VALUES ('2011-09-21 14:02:21', '2011-09-21 14:02:21', 2, 'El Estocolmo', 'Calle de la Palma 72, Madrid, Spain', geometry::STGeomFromText('POINT(-3.708969 40.426949)', 4326), geometry::STGeomFromText('POINT(-412880.540448036 4928180.70372423)', 3857))
GO
INSERT INTO test_table_2 VALUES ('2011-09-21 14:02:21', '2011-09-21 14:02:21', 3, 'El Rey del Tallarín', 'Plaza Conde de Toreno 2, Madrid, Spain', geometry::STGeomFromText('POINT(-3.70957 40.424654)', 4326), geometry::STGeomFromText('POINT(-412947.443462004 4927845.09853507)', 3857))
GO
INSERT INTO test_table_2 VALUES ('2011-09-21 14:02:21', '2011-09-21 14:02:21', 4, 'El Lacón', 'Manuel Fernández y González 8, Madrid, Spain',geometry::STGeomFromText('POINT(-3.699871 40.415113)', 4326), geometry::STGeomFromText('POINT(-411867.7557208 4926450.01033066)', 3857))
GO
INSERT INTO test_table_2 VALUES ('2011-09-21 14:02:21', '2011-09-21 14:02:21', 5, 'El Pico', 'Calle Divino Pastor 12, Madrid, Spain', geometry::STGeomFromText('POINT(-3.703991 40.428198)', 4326), geometry::STGeomFromText('POINT(-412326.392022869 4928363.35380041)', 3857));
GO






CREATE TABLE [dbo].[test_table_3](
	[updated_at] [datetime] NULL,
	[created_at] [datetime] NULL,
	[cartodb_id] [int] NOT NULL,
	[name] [nvarchar](max) NULL,
	[address] [nvarchar](max) NULL,
	[the_geom] [geometry] NULL,
	[the_geom_webmercator] [geometry] NULL,
 CONSTRAINT [test_table_3_pkey] PRIMARY KEY CLUSTERED 
(
	[cartodb_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]

GO

 --   CONSTRAINT enforce_dims_the_geom CHECK ((st_ndims(the_geom) = 2)),
 --   CONSTRAINT enforce_dims_the_geom_webmercator CHECK ((st_ndims(the_geom_webmercator) = 2)),
 --   CONSTRAINT enforce_geotype_the_geom CHECK (((geometrytype(the_geom) = 'POINT'::text) OR (the_geom IS NULL))),
 --   CONSTRAINT enforce_geotype_the_geom_webmercator CHECK (((geometrytype(the_geom_webmercator) = 'POINT'::text) OR (the_geom_webmercator IS NULL))),
 --   CONSTRAINT enforce_srid_the_geom CHECK ((st_srid(the_geom) = 4326)),
 --   CONSTRAINT enforce_srid_the_geom_webmercator CHECK ((st_srid(the_geom_webmercator) = 3857))

CREATE SPATIAL INDEX test_table_3_the_geom_idx ON test_table_3(the_geom)
USING  GEOMETRY_AUTO_GRID  
WITH (BOUNDING_BOX =(-180, -90, 180, 90), 
CELLS_PER_OBJECT = 16, PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
GO

CREATE SPATIAL INDEX test_table_3_the_geom_webmercator_idx ON test_table_3(the_geom_webmercator)
USING  GEOMETRY_AUTO_GRID  
WITH (BOUNDING_BOX =(-20037508.34,-20037508.34,20037508.34,20037508.34), 
CELLS_PER_OBJECT = 16, PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
GO


INSERT INTO test_table_3 VALUES ('2011-09-21 14:02:21', '2011-09-21 14:02:21', 1, 'Hawai', 'Calle de Pérez Galdós 9, Madrid, Spain', geometry::STGeomFromText('POINT(-3.699732 40.423012)', 4326), geometry::STGeomFromText('POINT(-411852.28231158 4927604.99065116)', 3857))
GO
INSERT INTO test_table_3 VALUES ('2011-09-21 14:02:21', '2011-09-21 14:02:21', 2, 'El Estocolmo', 'Calle de la Palma 72, Madrid, Spain', geometry::STGeomFromText('POINT(-3.708969 40.426949)', 4326), geometry::STGeomFromText('POINT(-412880.540448036 4928180.70372423)', 3857))
GO
INSERT INTO test_table_3 VALUES ('2011-09-21 14:02:21', '2011-09-21 14:02:21', 3, 'El Rey del Tallarín', 'Plaza Conde de Toreno 2, Madrid, Spain', geometry::STGeomFromText('POINT(-3.70957 40.424654)', 4326), geometry::STGeomFromText('POINT(-412947.443462004 4927845.09853507)', 3857))
GO
INSERT INTO test_table_3 VALUES ('2011-09-21 14:02:21', '2011-09-21 14:02:21', 4, 'El Lacón', 'Manuel Fernández y González 8, Madrid, Spain',geometry::STGeomFromText('POINT(-3.699871 40.415113)', 4326), geometry::STGeomFromText('POINT(-411867.7557208 4926450.01033066)', 3857))
GO
INSERT INTO test_table_3 VALUES ('2011-09-21 14:02:21', '2011-09-21 14:02:21', 5, 'El Pico', 'Calle Divino Pastor 12, Madrid, Spain', geometry::STGeomFromText('POINT(-3.703991 40.428198)', 4326), geometry::STGeomFromText('POINT(-412326.392022869 4928363.35380041)', 3857));
GO
